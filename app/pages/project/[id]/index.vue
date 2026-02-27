<script setup lang="ts">
import type { Book, Chapter, BookStats, WritingSession } from '~~/shared/types'

definePageMeta({ layout: 'default' })

const route = useRoute()
const id = route.params.id as string

const { data: book, status: bookStatus, error: bookError } = useBook(id)
const { data: stats, error: statsError } = useFetch<BookStats>(() => `/api/books/${id}/stats`)
const { data: chapters, error: chaptersError } = useFetch<Chapter[]>(() => `/api/chapters?bookId=${id}`)
const { data: writingSessions } = useFetch<WritingSession[]>(() => `/api/writing-sessions?bookId=${id}&limit=10`)

const fetchError = computed(() => bookError.value || statsError.value || chaptersError.value)

const latestChapter = computed(() => {
  if (!chapters.value) return null
  return chapters.value.length ? chapters.value[chapters.value.length - 1] : null
})

const statusColor = computed(() => {
  const colors: Record<string, string> = {
    planning: 'info',
    writing: 'primary',
    editing: 'warning',
    complete: 'success',
  }
  return colors[book.value?.status ?? ''] || 'neutral'
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
          <UBadge :color="statusColor as any" variant="soft" size="sm" class="capitalize">
            {{ book.status || 'planning' }}
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
            v-if="latestChapter"
            label="Continue Writing"
            icon="i-lucide-pen-line"
            :to="`/project/${id}/write/${latestChapter.id}`"
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
