<script setup lang="ts">
import type { Chapter, ChapterStatus } from '~~/shared/types'

const route = useRoute()
const projectId = route.params.id as string

const { data: chapters, status } = useFetch<Chapter[]>('/api/chapters', {
  query: { bookId: projectId },
})

const sortedChapters = computed(() => {
  if (!chapters.value) return []
  return [...chapters.value].sort((a, b) => a.sortOrder - b.sortOrder)
})

// If there's a chapter in "drafting" status, highlight it
const activeChapter = computed(() =>
  sortedChapters.value.find((c) => c.status === 'drafting') ?? sortedChapters.value[0],
)

function statusColor(status: ChapterStatus | string) {
  const map: Record<string, string> = {
    planned: 'neutral',
    outlined: 'info',
    drafting: 'warning',
    revising: 'violet',
    done: 'success',
  }
  return map[status] ?? 'neutral'
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-6 py-8 lg:px-8">
    <div class="mb-8">
      <h1 class="text-2xl font-serif font-bold text-(--ui-text-highlighted)">
        Writing Studio
      </h1>
      <p class="mt-1 text-sm text-(--ui-text-muted)">
        Select a chapter to begin writing.
      </p>
    </div>

    <!-- Loading -->
    <div v-if="status === 'pending'" class="space-y-3">
      <USkeleton v-for="i in 4" :key="i" class="h-16 rounded-lg" />
    </div>

    <!-- Chapter list -->
    <div v-else-if="sortedChapters.length" class="space-y-2">
      <NuxtLink
        v-for="chapter in sortedChapters"
        :key="chapter.id"
        :to="`/project/${projectId}/write/${chapter.id}`"
        class="flex items-center justify-between rounded-lg border border-(--ui-border) p-4 transition-colors hover:bg-(--ui-bg-elevated)"
        :class="{ 'ring-2 ring-(--ui-primary)/50': activeChapter?.id === chapter.id }"
      >
        <div class="flex items-center gap-3 min-w-0">
          <span class="text-sm font-mono text-(--ui-text-dimmed) w-8 shrink-0">
            {{ chapter.number }}
          </span>
          <div class="min-w-0">
            <p class="text-sm font-medium text-(--ui-text-highlighted) truncate">
              {{ chapter.title || 'Untitled Chapter' }}
            </p>
            <p v-if="chapter.synopsis" class="text-xs text-(--ui-text-muted) truncate mt-0.5">
              {{ chapter.synopsis }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3 shrink-0 ml-4">
          <span class="text-xs text-(--ui-text-dimmed)">
            {{ (chapter.wordCount ?? 0).toLocaleString() }} words
          </span>
          <UBadge :color="statusColor(chapter.status ?? 'planned') as any" variant="subtle" size="xs" class="capitalize">
            {{ chapter.status ?? 'planned' }}
          </UBadge>
        </div>
      </NuxtLink>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-16">
      <span class="i-lucide-pen-line text-4xl text-(--ui-text-muted) mb-4 inline-block" />
      <h3 class="text-lg font-medium text-(--ui-text-highlighted) mb-2">
        No chapters yet
      </h3>
      <p class="text-sm text-(--ui-text-muted) mb-6 max-w-md mx-auto">
        Create chapters in the Outline first, then come back here to write.
      </p>
      <UButton
        label="Go to Outline"
        icon="i-lucide-list-tree"
        :to="`/project/${projectId}/outline`"
      />
    </div>
  </div>
</template>
