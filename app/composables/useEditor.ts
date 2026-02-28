import { useEditor as useTiptapEditor } from "@tiptap/vue-3"
import StarterKit from "@tiptap/starter-kit"
import Typography from "@tiptap/extension-typography"
import Placeholder from "@tiptap/extension-placeholder"
import CharacterCount from "@tiptap/extension-character-count"
import { useDebounceFn } from "@vueuse/core"

function draftKey(id: string) {
  return `manuscrypt-draft-${id}`
}

export function useWritingEditor(chapterId: Ref<string>) {
  const isSaving = ref(false)
  const lastSavedAt = ref<Date | null>(null)
  const saveError = ref<string | null>(null)
  const lastSavedContent = ref<string | null>(null)
  const hasUnsavedChanges = ref(false)

  // Draft recovery state
  const hasDraftRecovery = ref(false)
  const draftContent = ref<object | null>(null)

  // Debounced localStorage backup (2s)
  const debouncedDraftSave = useDebounceFn((json: object) => {
    try {
      localStorage.setItem(
        draftKey(chapterId.value),
        JSON.stringify({ content: json, timestamp: Date.now() }),
      )
    } catch {
      // localStorage may be full or unavailable
    }
  }, 2000)

  const debouncedSave = useDebounceFn(async (json: object) => {
    isSaving.value = true
    saveError.value = null
    try {
      const currentWordCount = editor.value?.storage.characterCount.words() ?? 0
      await $fetch(`/api/chapters/${chapterId.value}` as string, {
        method: "PUT",
        body: { content: JSON.stringify(json), wordCount: currentWordCount },
      })
      lastSavedAt.value = new Date()
      lastSavedContent.value = JSON.stringify(json)
      hasUnsavedChanges.value = false

      // Clear localStorage draft on successful save
      try {
        localStorage.removeItem(draftKey(chapterId.value))
      } catch {
        // ignore
      }
    } catch (e) {
      saveError.value = e instanceof Error ? e.message : "Save failed"
    } finally {
      isSaving.value = false
    }
  }, 1000)

  // Reactive counter incremented on every editor transaction so that
  // computed values that read non-reactive editor storage (e.g. CharacterCount)
  // re-evaluate correctly.
  const editorUpdateTick = ref(0)

  const editor = useTiptapEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Typography,
      Placeholder.configure({
        placeholder: "Begin writing...",
      }),
      CharacterCount,
    ],
    ...({ immediatelyRender: false } as any),
    editorProps: {
      attributes: {
        class: "writing-mode ProseMirror prose prose-stone dark:prose-invert max-w-none focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      editorUpdateTick.value++
      const json = editor.getJSON()
      hasUnsavedChanges.value = JSON.stringify(json) !== lastSavedContent.value
      debouncedSave(json)
      debouncedDraftSave(json)
    },
  })

  const wordCount = computed(() => {
    editorUpdateTick.value // subscribe to editor updates
    return editor.value?.storage.characterCount.words() ?? 0
  })

  const characterCount = computed(() => {
    editorUpdateTick.value // subscribe to editor updates
    return editor.value?.storage.characterCount.characters() ?? 0
  })

  // beforeunload warning for unsaved changes
  function onBeforeUnload(e: BeforeUnloadEvent) {
    if (hasUnsavedChanges.value) {
      e.preventDefault()
    }
  }

  onMounted(() => {
    window.addEventListener("beforeunload", onBeforeUnload)
  })

  onBeforeUnmount(() => {
    window.removeEventListener("beforeunload", onBeforeUnload)
  })

  // Load initial content — wait for editor to be ready
  async function loadContent() {
    // If editor isn't ready yet, watch for it
    const ed = editor.value
    if (!ed) {
      watch(editor, (newEditor) => {
        if (newEditor) doLoadContent(newEditor)
      }, { once: true })
      return
    }
    doLoadContent(ed)
  }

  async function doLoadContent(ed: NonNullable<typeof editor.value>) {
    try {
      const chapter = await $fetch<{ content: string | null; updatedAt?: string }>(
        `/api/chapters/${chapterId.value}`,
      )
      let serverJson: object | null = null
      let serverTimestamp = 0

      if (chapter?.content) {
        serverJson =
          typeof chapter.content === "string"
            ? JSON.parse(chapter.content)
            : chapter.content
        serverTimestamp = chapter.updatedAt ? new Date(chapter.updatedAt).getTime() : 0
      }

      // Check for localStorage draft
      try {
        const raw = localStorage.getItem(draftKey(chapterId.value))
        if (raw) {
          const draft = JSON.parse(raw) as { content: object; timestamp: number }
          if (draft.content && draft.timestamp > serverTimestamp) {
            // Draft is newer — offer recovery
            draftContent.value = draft.content
            hasDraftRecovery.value = true
          } else {
            // Draft is older — remove it
            localStorage.removeItem(draftKey(chapterId.value))
          }
        }
      } catch {
        // ignore localStorage errors
      }

      // Load server content
      if (serverJson) {
        ed.commands.setContent(serverJson)
        lastSavedContent.value = JSON.stringify(serverJson)
      }
    } catch (e) {
      console.warn("[Manuscrypt] Failed to load chapter content:", e instanceof Error ? e.message : e)
    }
  }

  function recoverDraft() {
    if (!editor.value || !draftContent.value) return
    editor.value.commands.setContent(draftContent.value)
    hasDraftRecovery.value = false
    draftContent.value = null
  }

  function dismissRecovery() {
    hasDraftRecovery.value = false
    draftContent.value = null
    try {
      localStorage.removeItem(draftKey(chapterId.value))
    } catch {
      // ignore
    }
  }

  // Get selected text for AI commands
  function getSelectedText(): string {
    if (!editor.value) return ""
    const { from, to } = editor.value.state.selection
    return editor.value.state.doc.textBetween(from, to, " ")
  }

  // Snapshot the current selection (text + positions) before focus leaves
  function getSelectionSnapshot(): { text: string; from: number; to: number } | null {
    if (!editor.value) return null
    const { from, to } = editor.value.state.selection
    if (from === to) return null
    const text = editor.value.state.doc.textBetween(from, to, " ")
    return text ? { text, from, to } : null
  }

  // Replace content at a specific range (position-based, not selection-based)
  function replaceRange(from: number, to: number, text: string) {
    if (!editor.value) return
    editor.value.chain().focus().insertContentAt({ from, to }, text).run()
  }

  // Get the last N words for continue-writing context
  function getTrailingText(wordCount: number = 500): string {
    if (!editor.value) return ""
    const text = editor.value.getText()
    const words = text.split(/\s+/)
    return words.slice(-wordCount).join(" ")
  }

  // Insert text at cursor position
  function insertAtCursor(text: string) {
    if (!editor.value) return
    editor.value.chain().focus().insertContent(text).run()
  }

  // Replace selection with text
  function replaceSelection(text: string) {
    if (!editor.value) return
    editor.value.chain().focus().deleteSelection().insertContent(text).run()
  }

  const saveStatus = computed(() => {
    if (isSaving.value) return "Saving..."
    if (saveError.value) return "Error saving"
    if (lastSavedAt.value) return "Saved"
    return ""
  })

  return {
    editor,
    wordCount,
    characterCount,
    isSaving: readonly(isSaving),
    lastSavedAt: readonly(lastSavedAt),
    saveError: readonly(saveError),
    saveStatus,
    loadContent,
    getSelectedText,
    getSelectionSnapshot,
    getTrailingText,
    insertAtCursor,
    replaceSelection,
    replaceRange,
    hasDraftRecovery: readonly(hasDraftRecovery),
    recoverDraft,
    dismissRecovery,
  }
}
