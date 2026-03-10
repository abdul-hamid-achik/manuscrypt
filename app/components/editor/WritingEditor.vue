<script setup lang="ts">
import { EditorContent } from "@tiptap/vue-3"
import type { SelectionSnapshot } from "~/components/agents/AgentPanel.vue"

export interface WritingEditorHandle {
  getSelectedText: () => string
  getSelectionSnapshot: () => SelectionSnapshot | null
  getTrailingText: (wordCount?: number) => string
  insertAtCursor: (text: string) => void
  replaceSelection: (text: string) => void
  replaceRange: (from: number, to: number, text: string) => void
  wordCount: { value: number }
  characterCount: { value: number }
  saveStatus: { value: string }
  editor: { value: unknown }
  hasDraftRecovery: { value: boolean }
  recoverDraft: () => void
  dismissRecovery: () => void
  contentLoaded: { value: boolean }
  toggleSearch: () => void
  toggleVersionHistory: () => void
}

const props = withDefaults(defineProps<{
  chapterId: string
  focusMode?: boolean
  initialChapter?: { content: string | null; updatedAt?: string } | null
}>(), {
  focusMode: false,
  initialChapter: null,
})

const showFindReplace = ref(false)
const showVersionHistory = ref(false)

const chapterIdRef = toRef(props, "chapterId")
const {
  editor,
  wordCount,
  characterCount,
  saveStatus,
  loadContent,
  getSelectedText,
  getSelectionSnapshot,
  getTrailingText,
  insertAtCursor,
  contentLoaded,
  replaceSelection,
  replaceRange,
  hasDraftRecovery,
  recoverDraft,
  dismissRecovery,
} = useWritingEditor(chapterIdRef)

onMounted(() => {
  loadContent(props.initialChapter)
})

watch(
  () => props.chapterId,
  () => {
    loadContent(props.initialChapter)
  },
)

function toggleSearch() {
  showFindReplace.value = !showFindReplace.value
  if (showFindReplace.value) showVersionHistory.value = false
}

function toggleVersionHistory() {
  showVersionHistory.value = !showVersionHistory.value
  if (showVersionHistory.value) showFindReplace.value = false
}

function handleRestore(content: string) {
  if (!editor.value) return
  try {
    const json = JSON.parse(content)
    editor.value.commands.setContent(json)
  } catch {
    editor.value.commands.setContent(content)
  }
  showVersionHistory.value = false
}

// Keyboard shortcut: Cmd/Ctrl+F
function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === "f") {
    e.preventDefault()
    toggleSearch()
  }
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown)
})

defineExpose<WritingEditorHandle>({
  getSelectedText,
  getSelectionSnapshot,
  getTrailingText,
  insertAtCursor,
  replaceSelection,
  replaceRange,
  wordCount,
  characterCount,
  saveStatus,
  editor,
  hasDraftRecovery,
  recoverDraft,
  dismissRecovery,
  contentLoaded,
  toggleSearch,
  toggleVersionHistory,
})
</script>

<template>
  <div class="flex h-full">
    <div class="flex flex-col flex-1 min-w-0">
      <EditorToolbar
        v-if="editor && !focusMode"
        :editor="editor"
        @toggle-search="toggleSearch"
        @toggle-version-history="toggleVersionHistory"
      />
      <FindReplaceBar
        v-if="editor"
        :editor="editor"
        :visible="showFindReplace"
        @close="showFindReplace = false"
      />
      <div class="flex-1 overflow-y-auto writing-area px-8" :class="focusMode ? 'py-12' : 'py-6'">
        <div class="max-w-[65ch] mx-auto">
          <EditorContent
            v-if="editor"
            :editor="editor"
            class="min-h-full font-serif text-lg leading-relaxed"
          />
        </div>
      </div>
      <EditorStatusBar
        v-if="!focusMode"
        :word-count="wordCount"
        :character-count="characterCount"
        :save-status="saveStatus"
      />
    </div>
    <VersionHistory
      v-if="showVersionHistory"
      :chapter-id="chapterId"
      @close="showVersionHistory = false"
      @restore="handleRestore"
    />
  </div>
</template>
