<script setup lang="ts">
const props = defineProps<{
  book: {
    id: string
    title: string
    genre?: string | null
    status: string
    targetWordCount: number
    wordCount?: number
  }
}>()

const statusColor = computed(() => {
  const colors: Record<string, string> = {
    planning: 'info',
    writing: 'primary',
    editing: 'warning',
    complete: 'success',
  }
  return colors[props.book.status] || 'neutral'
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
          <UBadge :color="statusColor as any" variant="soft" size="sm" class="capitalize">
            {{ book.status }}
          </UBadge>
        </div>

        <ProjectProgress
          :current="book.wordCount ?? 0"
          :target="book.targetWordCount"
        />
      </div>
    </UCard>
  </NuxtLink>
</template>
