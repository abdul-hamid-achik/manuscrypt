<script setup lang="ts">
import type { Chapter } from '~~/shared/types'
import { CHAPTER_STATUSES } from '~~/shared/types'

definePageMeta({ layout: 'default' })

const route = useRoute()
const id = route.params.id as string

const { data: chapters, status, refresh } = useFetch<Chapter[]>(() => `/api/chapters?bookId=${id}`)

const statusFilter = ref('')
const statusOptions = ['', ...CHAPTER_STATUSES]
const statusLabels: Record<string, string> = {
  '': 'All',
  planned: 'Planned',
  outlined: 'Outlined',
  drafting: 'Drafting',
  revising: 'Revising',
  done: 'Done',
}

const filteredChapters = computed(() => {
  const list = chapters.value ?? []
  if (!statusFilter.value) return list
  return list.filter((ch) => ch.status === statusFilter.value)
})

function statusColor(status: string | null): string {
  const colors: Record<string, string> = {
    planned: 'neutral',
    outlined: 'info',
    drafting: 'warning',
    revising: 'violet',
    done: 'success',
  }
  return colors[status ?? 'planned'] || 'neutral'
}

function formatStatus(status: string | null): string {
  if (!status) return 'Planned'
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

async function markStatus(chapterId: string, newStatus: string) {
  await $fetch(`/api/chapters/${chapterId}` as string, {
    method: 'PUT',
    body: { status: newStatus },
  })
  await refresh()
}

// AI Review state
interface ReviewCategory {
  score: number
  feedback: string
}

interface AIReview {
  overallImpression: string
  proseQuality: ReviewCategory
  pacing: ReviewCategory
  dialogue: ReviewCategory
  characterVoice: ReviewCategory
  suggestions: string[]
}

const reviews = reactive(new Map<string, AIReview>())
const reviewLoading = reactive(new Map<string, boolean>())
const reviewErrors = reactive(new Map<string, string>())
const expandedReviews = reactive(new Set<string>())

async function requestReview(chapterId: string) {
  reviewLoading.set(chapterId, true)
  reviewErrors.delete(chapterId)

  try {
    const result = await $fetch<AIReview>('/api/ai/review', {
      method: 'POST',
      body: { chapterId },
    })
    reviews.set(chapterId, result)
    expandedReviews.add(chapterId)
  } catch (error: any) {
    reviewErrors.set(chapterId, error?.data?.message || error?.message || 'Review failed')
  } finally {
    reviewLoading.set(chapterId, false)
  }
}

function toggleReview(chapterId: string) {
  if (expandedReviews.has(chapterId)) {
    expandedReviews.delete(chapterId)
  } else {
    expandedReviews.add(chapterId)
  }
}

function scoreColor(score: number): string {
  if (score >= 7) return 'success'
  if (score >= 4) return 'warning'
  return 'error'
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-6 py-8 lg:px-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-(--ui-text-highlighted) tracking-tight">
        Revision Hub
      </h1>
      <p class="mt-1 text-sm text-(--ui-text-muted)">
        Track and manage the revision status of each chapter.
      </p>
    </div>

    <!-- Filter -->
    <div class="mb-6">
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="opt in statusOptions"
          :key="opt"
          :label="statusLabels[opt]"
          :variant="statusFilter === opt ? 'solid' : 'ghost'"
          size="sm"
          @click="statusFilter = opt"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="status === 'pending'" class="space-y-2">
      <USkeleton v-for="i in 5" :key="i" class="h-16 rounded-lg" />
    </div>

    <!-- Empty state -->
    <div v-else-if="!chapters?.length" class="mt-16 flex flex-col items-center text-center">
      <div class="mb-4 text-5xl opacity-30">
        <span class="i-lucide-check-circle" />
      </div>
      <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">No chapters yet</h2>
      <p class="mt-2 max-w-md text-sm text-(--ui-text-muted)">
        Create chapters in the Outline to begin reviewing your work.
      </p>
      <UButton
        label="Go to Outline"
        class="mt-4"
        variant="soft"
        icon="i-lucide-list-tree"
        :to="`/project/${id}/outline`"
      />
    </div>

    <!-- Chapters List -->
    <div v-else-if="chapters?.length" class="space-y-2">
      <div
        v-for="chapter in filteredChapters"
        :key="chapter.id"
      >
        <div
          class="flex items-center gap-4 rounded-lg border border-(--ui-border) px-4 py-3 transition-colors hover:bg-(--ui-bg-elevated)"
        >
          <!-- Chapter number -->
          <div class="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--ui-bg-elevated) text-sm font-semibold text-(--ui-text-muted)">
            {{ chapter.number }}
          </div>

          <!-- Title + word count -->
          <div class="min-w-0 flex-1">
            <h3 class="truncate text-sm font-medium text-(--ui-text-highlighted)">
              {{ chapter.title || `Chapter ${chapter.number}` }}
            </h3>
            <p class="text-xs text-(--ui-text-dimmed)">
              {{ (chapter.wordCount ?? 0).toLocaleString() }} words
            </p>
          </div>

          <!-- Status badge -->
          <UBadge :color="statusColor(chapter.status) as any" variant="soft" size="sm" class="capitalize">
            {{ formatStatus(chapter.status) }}
          </UBadge>

          <!-- Actions -->
          <div class="flex shrink-0 gap-1.5">
            <UButton
              v-if="chapter.status !== 'revising'"
              label="Mark Revising"
              size="xs"
              variant="ghost"
              color="warning"
              @click="markStatus(chapter.id, 'revising')"
            />
            <UButton
              v-if="chapter.status === 'revising'"
              label="Mark Done"
              size="xs"
              variant="ghost"
              color="success"
              @click="markStatus(chapter.id, 'done')"
            />
            <UButton
              v-if="reviews.has(chapter.id) && !reviewLoading.get(chapter.id)"
              :label="expandedReviews.has(chapter.id) ? 'Hide Review' : 'Show Review'"
              size="xs"
              variant="ghost"
              color="info"
              :icon="expandedReviews.has(chapter.id) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              @click="toggleReview(chapter.id)"
            />
            <UButton
              :label="reviewLoading.get(chapter.id) ? 'Reviewing...' : 'AI Review'"
              size="xs"
              variant="soft"
              color="primary"
              icon="i-lucide-sparkles"
              :loading="reviewLoading.get(chapter.id)"
              :disabled="reviewLoading.get(chapter.id)"
              @click="requestReview(chapter.id)"
            />
            <UButton
              label="Review"
              size="xs"
              variant="soft"
              :to="`/project/${id}/write/${chapter.id}`"
            />
          </div>
        </div>

        <!-- Review error -->
        <div v-if="reviewErrors.has(chapter.id)" class="mt-2 ml-12 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {{ reviewErrors.get(chapter.id) }}
        </div>

        <!-- AI Review Results -->
        <div v-if="reviews.has(chapter.id) && expandedReviews.has(chapter.id)" class="mt-2">
          <UCard class="ml-12">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-sparkles" class="text-(--ui-primary)" />
                  <span class="text-sm font-semibold text-(--ui-text-highlighted)">AI Review</span>
                </div>
                <UButton
                  icon="i-lucide-x"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  @click="expandedReviews.delete(chapter.id)"
                />
              </div>
            </template>

            <!-- Overall Impression -->
            <div class="mb-4">
              <h4 class="mb-1 text-xs font-semibold uppercase tracking-wide text-(--ui-text-muted)">Overall Impression</h4>
              <p class="text-sm text-(--ui-text-highlighted)">{{ reviews.get(chapter.id)!.overallImpression }}</p>
            </div>

            <!-- Score Badges -->
            <div class="mb-4 flex flex-wrap gap-2">
              <UBadge :color="scoreColor(reviews.get(chapter.id)!.proseQuality.score) as any" variant="soft" size="sm">
                Prose: {{ reviews.get(chapter.id)!.proseQuality.score }}/10
              </UBadge>
              <UBadge :color="scoreColor(reviews.get(chapter.id)!.pacing.score) as any" variant="soft" size="sm">
                Pacing: {{ reviews.get(chapter.id)!.pacing.score }}/10
              </UBadge>
              <UBadge :color="scoreColor(reviews.get(chapter.id)!.dialogue.score) as any" variant="soft" size="sm">
                Dialogue: {{ reviews.get(chapter.id)!.dialogue.score }}/10
              </UBadge>
              <UBadge :color="scoreColor(reviews.get(chapter.id)!.characterVoice.score) as any" variant="soft" size="sm">
                Character Voice: {{ reviews.get(chapter.id)!.characterVoice.score }}/10
              </UBadge>
            </div>

            <!-- Category Feedback -->
            <div class="mb-4 space-y-3">
              <div>
                <h4 class="text-xs font-semibold text-(--ui-text-muted)">Prose Quality</h4>
                <p class="text-sm text-(--ui-text-highlighted)">{{ reviews.get(chapter.id)!.proseQuality.feedback }}</p>
              </div>
              <div>
                <h4 class="text-xs font-semibold text-(--ui-text-muted)">Pacing</h4>
                <p class="text-sm text-(--ui-text-highlighted)">{{ reviews.get(chapter.id)!.pacing.feedback }}</p>
              </div>
              <div>
                <h4 class="text-xs font-semibold text-(--ui-text-muted)">Dialogue</h4>
                <p class="text-sm text-(--ui-text-highlighted)">{{ reviews.get(chapter.id)!.dialogue.feedback }}</p>
              </div>
              <div>
                <h4 class="text-xs font-semibold text-(--ui-text-muted)">Character Voice</h4>
                <p class="text-sm text-(--ui-text-highlighted)">{{ reviews.get(chapter.id)!.characterVoice.feedback }}</p>
              </div>
            </div>

            <!-- Suggestions -->
            <div>
              <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-(--ui-text-muted)">Suggestions</h4>
              <ol class="list-decimal space-y-1 pl-5">
                <li
                  v-for="(suggestion, idx) in reviews.get(chapter.id)!.suggestions"
                  :key="idx"
                  class="text-sm text-(--ui-text-highlighted)"
                >
                  {{ suggestion }}
                </li>
              </ol>
            </div>
          </UCard>
        </div>
      </div>

      <!-- No results after filter -->
      <div v-if="filteredChapters.length === 0" class="py-8 text-center text-sm text-(--ui-text-dimmed)">
        No chapters match the selected filter.
      </div>
    </div>
  </div>
</template>
