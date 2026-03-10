<script setup lang="ts">
import { timeAgo } from '~/utils/format-date'
import { BOOK_STATUSES } from '~~/shared/types'

const props = defineProps<{
  book: {
    id: string
    title: string
    genre?: string | null
    status: string | null
    targetWordCount: number | null
    wordCount?: number
    chapterCount?: number
    updatedAt?: string | null
  }
}>()

const statusColor = computed(() => {
  type BadgeColor = 'neutral' | 'info' | 'warning' | 'success' | 'primary'
  const colors: Record<string, BadgeColor> = {
    planning: 'info',
    outlining: 'primary',
    drafting: 'warning',
    revising: 'warning',
    done: 'success',
  }
  const normalizedStatus = BOOK_STATUSES.includes((props.book.status as (typeof BOOK_STATUSES)[number] | undefined) ?? BOOK_STATUSES[0])
    ? (props.book.status as (typeof BOOK_STATUSES)[number])
    : BOOK_STATUSES[0]
  return colors[normalizedStatus] || 'neutral'
})

const chapterLabel = computed(() => {
  const count = props.book.chapterCount ?? 0
  if (count === 0) return 'No chapters yet'
  return `${count} chapter${count === 1 ? '' : 's'}`
})

const wordCountLabel = computed(() => {
  const wc = props.book.wordCount ?? 0
  if (wc === 0) return null
  return `${wc.toLocaleString()} words`
})

const updatedLabel = computed(() => {
  if (!props.book.updatedAt) return null
  return `Updated ${timeAgo(props.book.updatedAt)}`
})
</script>

<template>
  <NuxtLink :to="`/project/${book.id}`" class="group block">
    <UCard
      class="h-full transition-colors duration-200 group-hover:ring-(--ui-primary)/40"
    >
      <div class="space-y-3">
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-semibold text-(--ui-text-highlighted) leading-snug line-clamp-2">
            {{ book.title }}
          </h3>
        </div>

        <div class="flex flex-wrap items-center gap-1.5">
          <UBadge v-if="book.genre" variant="subtle" size="sm">
            {{ book.genre }}
          </UBadge>
          <UBadge :color="statusColor" variant="soft" size="sm" class="capitalize">
            {{ book.status }}
          </UBadge>
        </div>

        <ProjectProgress
          :current="book.wordCount ?? 0"
          :target="book.targetWordCount ?? 0"
        />

        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-(--ui-text-muted)">
          <span>{{ chapterLabel }}</span>
          <span v-if="wordCountLabel">{{ wordCountLabel }}</span>
          <span v-if="updatedLabel">{{ updatedLabel }}</span>
        </div>
      </div>
    </UCard>
  </NuxtLink>
</template>
