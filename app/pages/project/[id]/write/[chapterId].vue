<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import type { Chapter, Book } from '~~/shared/types'

definePageMeta({
  layout: "writing",
})

const route = useRoute()
const projectId = route.params.id as string
const chapterId = route.params.chapterId as string

const { data: chapter, error: chapterError } = await useFetch<Chapter>(`/api/chapters/${chapterId}`)
const { data: book, error: bookError } = await useFetch<Book>(`/api/books/${projectId}`)
const { data: allChapters, error: chaptersError } = await useFetch<Chapter[]>(`/api/chapters`, { params: { bookId: projectId } })

const fetchError = computed(() => chapterError.value || bookError.value || chaptersError.value)

// Chapter navigation
const sortedChapters = computed(() =>
  [...(allChapters.value ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
)
const currentIndex = computed(() =>
  sortedChapters.value.findIndex((c) => c.id === chapterId)
)
const prevChapter = computed(() =>
  currentIndex.value > 0 ? sortedChapters.value[currentIndex.value - 1] : null
)
const nextChapter = computed(() =>
  currentIndex.value < sortedChapters.value.length - 1 ? sortedChapters.value[currentIndex.value + 1] : null
)

// Share chapter nav with the writing layout
const prevChapterId = useState<string | null>("writingPrevChapterId", () => null)
const nextChapterId = useState<string | null>("writingNextChapterId", () => null)
const prevChapterTitle = useState<string>("writingPrevChapterTitle", () => "")
const nextChapterTitle = useState<string>("writingNextChapterTitle", () => "")

watchEffect(() => {
  prevChapterId.value = prevChapter.value?.id ?? null
  nextChapterId.value = nextChapter.value?.id ?? null
  prevChapterTitle.value = prevChapter.value?.title || `Chapter ${prevChapter.value?.number}`
  nextChapterTitle.value = nextChapter.value?.title || `Chapter ${nextChapter.value?.number}`
})

const editorRef = ref<any>(null)
const agentPanelRef = ref<any>(null)

// Share state with the writing layout via useState — set values explicitly
// since the layout may initialize these first with defaults
const chapterTitle = useState<string>("writingChapterTitle", () => "Untitled")
chapterTitle.value = chapter.value?.title ?? "Untitled Chapter"

const bookTitle = useState<string>("writingBookTitle", () => "")
bookTitle.value = book.value?.title ?? ""

const writingProjectId = useState<string>("writingProjectId", () => "")
writingProjectId.value = projectId

const writingWordCount = useState<number>("writingWordCount", () => 0)
const writingSaveStatus = useState<string>("writingSaveStatus", () => "")
const writingSessionDuration = useState<string>("writingSessionDuration", () => "")

// Writing stats
const stats = useWritingStats(projectId)

// Keep word count and save status in sync with editor
watchEffect(() => {
  const wc = editorRef.value?.wordCount?.value ?? 0
  writingWordCount.value = wc
  stats.updateWordCount(wc)
})
watchEffect(() => {
  writingSaveStatus.value = editorRef.value?.saveStatus?.value ?? ""
})

// Keep session duration in sync
const sessionDurationInterval = ref<ReturnType<typeof setInterval>>()
onMounted(() => {
  sessionDurationInterval.value = setInterval(() => {
    writingSessionDuration.value = stats.sessionDurationFormatted.value
  }, 10000) // Update every 10 seconds
})
onBeforeUnmount(() => {
  if (sessionDurationInterval.value) clearInterval(sessionDurationInterval.value)
})

// Save chapter title on change
const debouncedTitleSave = useDebounceFn(async (title: string) => {
  await $fetch(`/api/chapters/${chapterId}` as string, {
    method: "PUT",
    body: { title },
  })
}, 500)

watch(chapterTitle, (val) => {
  debouncedTitleSave(val)
})

// Handle AI commands from the command menu
function handleAiCommand(command: string) {
  if (!editorRef.value || !agentPanelRef.value) return

  const selectedText = editorRef.value.getSelectedText()
  const context = selectedText || editorRef.value.getTrailingText()

  agentPanelRef.value.executeCommand(command, context)
}

// Handle AI text insertion into editor
function handleInsertFromAgent(text: string) {
  editorRef.value?.insertAtCursor(text)
}

// Handle AI text replacement using stored selection range
function handleReplaceFromAgent(text: string, from: number, to: number) {
  if (from >= 0 && to >= 0) {
    editorRef.value?.replaceRange(from, to, text)
  } else {
    editorRef.value?.replaceSelection(text)
  }
}

// Draft recovery — proxy from editor ref
const hasDraftRecovery = computed(() => editorRef.value?.hasDraftRecovery?.value ?? false)
function recoverDraft() { editorRef.value?.recoverDraft() }
function dismissRecovery() { editorRef.value?.dismissRecovery() }

// Focus mode state from layout
const focusMode = useState<boolean>("writingFocusMode", () => false)

onMounted(() => {
  const initialWordCount = editorRef.value?.wordCount?.value ?? 0
  stats.startSession(initialWordCount)
})

onBeforeUnmount(() => {
  stats.endSession(chapterId)
})
</script>

<template>
  <div v-if="fetchError" class="flex flex-col items-center justify-center h-full gap-4">
    <UIcon name="i-lucide-alert-triangle" class="text-4xl text-red-500" />
    <p class="text-lg text-(--ui-text-dimmed)">Failed to load chapter</p>
    <UButton label="Go Back" variant="outline" @click="$router.back()" />
  </div>
  <div v-else class="flex" :class="focusMode ? 'h-dvh' : 'h-[calc(100vh-3rem)]'">
    <!-- Main editor area -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Chapter title — hidden in focus mode -->
      <div v-show="!focusMode" class="px-8 pt-6 pb-2 max-w-[65ch] mx-auto w-full">
        <input
          v-model="chapterTitle"
          class="w-full text-2xl font-serif font-bold bg-transparent border-none outline-none text-(--ui-text-highlighted) placeholder:text-(--ui-text-muted)"
          placeholder="Chapter Title"
        />
      </div>

      <!-- Draft recovery banner -->
      <div v-if="hasDraftRecovery" class="px-8 max-w-[65ch] mx-auto w-full">
        <div class="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4 flex items-center justify-between">
          <span class="text-sm text-amber-800 dark:text-amber-200">Unsaved draft found from a previous session.</span>
          <div class="flex gap-2">
            <UButton size="xs" color="primary" @click="recoverDraft">Restore Draft</UButton>
            <UButton size="xs" variant="ghost" @click="dismissRecovery">Dismiss</UButton>
          </div>
        </div>
      </div>

      <!-- Editor -->
      <WritingEditor
        ref="editorRef"
        :chapter-id="chapterId"
        :focus-mode="focusMode"
        class="flex-1"
      />
    </div>

    <!-- AI Agent Panel — hidden in focus mode -->
    <AgentPanel
      v-show="!focusMode"
      ref="agentPanelRef"
      :book-id="projectId"
      :chapter-id="chapterId"
      :get-editor-snapshot="() => editorRef?.getSelectionSnapshot() ?? null"
      @insert="handleInsertFromAgent"
      @replace="handleReplaceFromAgent"
    />
  </div>
</template>
