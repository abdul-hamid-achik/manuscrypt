<script setup lang="ts">
import type { Chapter, BookStats, WritingSession } from '~~/shared/types'
import { BOOK_STATUSES } from '~~/shared/types'

definePageMeta({ layout: 'default' })

const route = useRoute()
const id = route.params.id as string

const { data: book, status: bookStatus, error: bookError } = useBook(id)
const { data: stats, error: statsError } = useFetch<BookStats>(() => `/api/books/${id}/stats`)
const { data: chapters, error: chaptersError } = useFetch<Chapter[]>(() => `/api/chapters?bookId=${id}`)
const { data: writingSessions, error: sessionsError } = useFetch<WritingSession[]>(`/api/writing-sessions`, {
  query: {
    bookId: id,
    includeAll: true,
  },
})
const { data: resumeWritingSessions, error: resumeSessionsError } = useFetch<WritingSession[]>(`/api/writing-sessions`, {
  query: {
    bookId: id,
    limit: 1,
  },
})

const fetchError = computed(() => bookError.value || statsError.value || chaptersError.value || sessionsError.value || resumeSessionsError.value)

const resumeChapterId = computed(() => resumeWritingSessions.value?.find((s) => s.chapterId)?.chapterId ?? null)

const sortedChapters = computed(() => [...(chapters.value ?? [])].sort((a, b) => a.sortOrder - b.sortOrder))

const writingPriority = {
  drafting: 4,
  revising: 3,
  outlined: 2,
  planned: 1,
  done: 0,
}

const continueChapter = computed(() => {
  if (!sortedChapters.value.length) return null
  if (resumeChapterId.value) {
    const fromSession = sortedChapters.value.find((chapter) => chapter.id === resumeChapterId.value && chapter.status !== 'done')
    if (fromSession) return fromSession
  }

  const activeChapters = sortedChapters.value.filter((chapter) => chapter.status && chapter.status !== 'done')
  if (!activeChapters.length) return sortedChapters.value[sortedChapters.value.length - 1]

  const ranked = [...activeChapters].sort((a, b) => {
    const aRank = writingPriority[a.status as keyof typeof writingPriority] ?? 1
    const bRank = writingPriority[b.status as keyof typeof writingPriority] ?? 1
    if (aRank !== bRank) return bRank - aRank
    return b.sortOrder - a.sortOrder
  })

  return ranked[0]
})

const statusColor = computed(() => {
  type BadgeColor = 'neutral' | 'primary' | 'warning' | 'success' | 'info'
  const colors: Record<string, string> = {
    planning: 'info',
    outlining: 'primary',
    drafting: 'warning',
    revising: 'warning',
    done: 'success',
  }
  return (colors[book.value?.status ?? ''] ?? 'neutral') as BadgeColor
})

const statusLabel = computed(() => {
  const status = book.value?.status
  const normalizedStatus = BOOK_STATUSES.includes(status as typeof BOOK_STATUSES[number])
    ? status
    : BOOK_STATUSES[0]
  const value = normalizedStatus ?? BOOK_STATUSES[0]
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
})

function formatCount(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

const sessionStats = computed(() => {
  const sessions = writingSessions.value ?? []
  if (!sessions.length) return null
  const totalWords = sessions.reduce((sum, s) => sum + (s.wordsWritten ?? 0), 0)
  const totalDuration = sessions.reduce((sum, s) => sum + (s.duration ?? 0), 0)
  return {
    count: sessions.length,
    totalWords,
    totalDuration,
    avgWordsPerSession: sessions.length ? Math.round(totalWords / sessions.length) : 0,
  }
})
</script>

<template>
  <div class="mx-auto max-w-5xl px-6 py-8 lg:px-8">
    <!-- Error -->
    <div v-if="fetchError" class="flex flex-col items-center justify-center py-16 gap-4">
      <UIcon name="i-lucide-alert-triangle" class="text-4xl text-red-500" />
      <p class="text-lg text-(--ui-text-dimmed)">Failed to load project</p>
      <UButton label="Go Back" variant="outline" @click="$router.back()" />
    </div>

    <!-- Loading -->
    <div v-else-if="bookStatus === 'pending'" class="space-y-6">
      <USkeleton class="h-10 w-72 rounded-lg" />
      <USkeleton class="h-4 w-48 rounded" />
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <USkeleton v-for="i in 4" :key="i" class="h-24 rounded-lg" />
      </div>
    </div>

    <template v-else-if="book">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-(--ui-text-highlighted) tracking-tight">
          {{ book.title }}
        </h1>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <UBadge v-if="book.genre" variant="subtle" size="sm">
            {{ book.genre }}
          </UBadge>
          <UBadge :color="statusColor" variant="soft" size="sm" class="capitalize">
            {{ statusLabel }}
          </UBadge>
        </div>
        <p v-if="book.premise" class="mt-4 max-w-2xl text-sm text-(--ui-text-muted) leading-relaxed">
          {{ book.premise }}
        </p>
      </div>

      <!-- Stats Cards -->
      <div v-if="stats" class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UCard>
          <div class="text-center">
            <div class="text-2xl font-bold text-(--ui-text-highlighted)">
              {{ stats.totalChapters }}
            </div>
            <div class="mt-1 text-xs text-(--ui-text-dimmed)">Chapters</div>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <div class="text-2xl font-bold text-(--ui-text-highlighted)">
              {{ formatCount(stats.totalWords) }}
            </div>
            <div class="mt-1 text-xs text-(--ui-text-dimmed)">Words</div>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <div class="text-2xl font-bold text-(--ui-text-highlighted)">
              {{ stats.totalCharacters }}
            </div>
            <div class="mt-1 text-xs text-(--ui-text-dimmed)">Characters</div>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <div class="text-2xl font-bold text-(--ui-primary)">
              {{ stats.completionPercentage }}%
            </div>
            <div class="mt-1 text-xs text-(--ui-text-dimmed)">Complete</div>
          </div>
        </UCard>
      </div>

      <!-- Progress Bar -->
      <div v-if="book.targetWordCount && stats" class="mb-10">
        <ProjectProgress
          :current="stats.totalWords"
          :target="book.targetWordCount"
        />
      </div>

      <!-- Writing Stats -->
      <div v-if="sessionStats" class="mb-10">
        <h2 class="mb-4 text-lg font-semibold text-(--ui-text-highlighted)">Writing Activity</h2>
        <div class="grid gap-4 sm:grid-cols-3">
          <UCard>
            <div class="text-center">
              <div class="text-2xl font-bold text-(--ui-text-highlighted)">
                {{ sessionStats.count }}
              </div>
              <div class="mt-1 text-xs text-(--ui-text-dimmed)">Writing Sessions</div>
            </div>
          </UCard>
          <UCard>
            <div class="text-center">
              <div class="text-2xl font-bold text-(--ui-text-highlighted)">
                {{ formatDuration(sessionStats.totalDuration) }}
              </div>
              <div class="mt-1 text-xs text-(--ui-text-dimmed)">Total Time</div>
            </div>
          </UCard>
          <UCard>
            <div class="text-center">
              <div class="text-2xl font-bold text-(--ui-text-highlighted)">
                {{ formatCount(sessionStats.avgWordsPerSession) }}
              </div>
              <div class="mt-1 text-xs text-(--ui-text-dimmed)">Avg Words / Session</div>
            </div>
          </UCard>
        </div>
      </div>

      <!-- Quick Links -->
      <div class="mb-10">
        <h2 class="mb-4 text-lg font-semibold text-(--ui-text-highlighted)">Quick Actions</h2>
        <div class="flex flex-wrap gap-3">
        <UButton
          v-if="continueChapter"
          label="Continue Writing"
          icon="i-lucide-pen-line"
          :to="`/project/${id}/write/${continueChapter.id}`"
        />
          <UButton
            label="Story Bible"
            variant="soft"
            icon="i-lucide-book-open"
            :to="`/project/${id}/bible`"
          />
          <UButton
            label="Outline"
            variant="soft"
            icon="i-lucide-list-tree"
            :to="`/project/${id}/outline`"
          />
          <UButton
            label="Export"
            variant="soft"
            icon="i-lucide-download"
            :to="`/project/${id}/export`"
          />
        </div>
      </div>

      <!-- Edit Project -->
      <UButton
        label="Edit Project Settings"
        variant="ghost"
        icon="i-lucide-settings"
        :to="`/project/${id}/settings`"
      />
    </template>
  </div>
</template>
