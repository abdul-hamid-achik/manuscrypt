<script setup lang="ts">
const route = useRoute()
const projectId = computed(() => route.params.id as string)

// Simple shared state — the writing page sets these values
const chapterTitle = useState<string>("writingChapterTitle", () => "Untitled")
const bookTitle = useState<string>("writingBookTitle", () => "")
const wordCount = useState<number>("writingWordCount", () => 0)
const saveStatus = useState<string>("writingSaveStatus", () => "")

// Chapter navigation — the writing page populates these
const sessionDuration = useState<string>("writingSessionDuration", () => "")
const prevChapterId = useState<string | null>("writingPrevChapterId", () => null)
const nextChapterId = useState<string | null>("writingNextChapterId", () => null)
const prevChapterTitle = useState<string>("writingPrevChapterTitle", () => "")
const nextChapterTitle = useState<string>("writingNextChapterTitle", () => "")

// Focus mode — hides chrome for distraction-free writing
const focusMode = useState<boolean>("writingFocusMode", () => false)

function toggleFocusMode() {
  focusMode.value = !focusMode.value
}

// Keyboard shortcut: Escape to exit focus mode, Cmd+Shift+F to toggle
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && focusMode.value) {
    focusMode.value = false
  } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
    e.preventDefault()
    toggleFocusMode()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="writing-mode flex h-dvh flex-col bg-(--ui-bg)">
    <!-- Slim top bar — hidden in focus mode -->
    <header
      v-show="!focusMode"
      class="flex h-12 shrink-0 items-center justify-between border-b border-(--ui-border) px-4"
    >
      <div class="flex items-center gap-3">
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-arrow-left"
          size="xs"
          :to="`/project/${projectId}/write`"
          aria-label="Back to chapters"
        />
        <span class="text-xs text-(--ui-text-muted)">{{ bookTitle }}</span>
        <span class="text-(--ui-border)">/</span>
        <span class="text-sm font-medium text-(--ui-text-highlighted)">
          {{ chapterTitle }}
        </span>
      </div>

      <div class="flex items-center gap-4">
        <!-- Chapter navigation -->
        <div class="flex items-center gap-1">
          <UTooltip v-if="prevChapterId" :text="`← ${prevChapterTitle}`">
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-lucide-chevron-left"
              size="xs"
              :to="`/project/${projectId}/write/${prevChapterId}`"
              aria-label="Previous chapter"
            />
          </UTooltip>
          <UButton
            v-else
            variant="ghost"
            color="neutral"
            icon="i-lucide-chevron-left"
            size="xs"
            disabled
          />
          <UTooltip v-if="nextChapterId" :text="`${nextChapterTitle} →`">
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-lucide-chevron-right"
              size="xs"
              :to="`/project/${projectId}/write/${nextChapterId}`"
              aria-label="Next chapter"
            />
          </UTooltip>
          <UButton
            v-else
            variant="ghost"
            color="neutral"
            icon="i-lucide-chevron-right"
            size="xs"
            disabled
          />
        </div>

        <!-- Focus mode toggle -->
        <UTooltip text="Focus mode (⌘⇧F)">
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-lucide-maximize-2"
            size="xs"
            @click="toggleFocusMode"
            aria-label="Enter focus mode"
          />
        </UTooltip>

        <div class="flex items-center gap-4 text-xs text-(--ui-text-dimmed)">
          <span v-if="sessionDuration" class="flex items-center gap-1">
            <span class="i-lucide-clock size-3" />
            {{ sessionDuration }}
          </span>
          <span>{{ wordCount.toLocaleString() }} words</span>
          <span
            v-if="saveStatus"
            :class="{
              'text-green-500': saveStatus === 'Saved',
              'text-amber-500': saveStatus === 'Saving...',
            }"
          >
            {{ saveStatus }}
          </span>
        </div>
      </div>
    </header>

    <!-- Focus mode exit hint — shown briefly on enter -->
    <div
      v-if="focusMode"
      class="absolute top-4 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-(--ui-bg-elevated) border border-(--ui-border) px-4 py-2 text-xs text-(--ui-text-dimmed) shadow-lg opacity-60 pointer-events-none animate-pulse"
    >
      Press Esc or ⌘⇧F to exit focus mode
    </div>

    <!-- Writing content -->
    <main class="flex-1 overflow-hidden">
      <slot />
    </main>
  </div>
</template>
