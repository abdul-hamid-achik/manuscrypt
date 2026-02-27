<script setup lang="ts">
import type { Scene } from '~~/shared/types'

const props = defineProps<{
  scene: Scene
}>()

const emit = defineEmits<{
  edit: [scene: Scene]
  delete: [id: string]
}>()

const statusConfig: Record<string, { color: string; label: string }> = {
  planned: { color: 'neutral', label: 'Planned' },
  outlined: { color: 'info', label: 'Outlined' },
  drafting: { color: 'primary', label: 'Drafting' },
  revising: { color: 'warning', label: 'Revising' },
  done: { color: 'success', label: 'Done' },
}

const sceneStatus = computed(() => {
  const s = props.scene.status ?? 'planned'
  return statusConfig[s] ?? statusConfig.planned!
})

const moodDisplay = computed(() => {
  if (!props.scene.moodStart && !props.scene.moodEnd) return null
  const start = props.scene.moodStart ?? '?'
  const end = props.scene.moodEnd ?? '?'
  return `${start} \u2192 ${end}`
})
</script>

<template>
  <div class="group flex items-start gap-3 rounded-lg border border-(--ui-border) bg-(--ui-bg) p-3 transition-colors hover:border-(--ui-border-accented)">
    <div class="min-w-0 flex-1 space-y-1.5">
      <div class="flex items-center gap-2">
        <span class="i-lucide-clapperboard size-3.5 shrink-0 text-(--ui-text-dimmed)" />
        <span class="text-sm font-medium text-(--ui-text-highlighted) truncate">
          {{ scene.title }}
        </span>
        <UBadge :color="sceneStatus.color as any" variant="subtle" size="xs">
          {{ sceneStatus.label }}
        </UBadge>
      </div>

      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-(--ui-text-muted)">
        <span v-if="scene.povCharacterId" class="flex items-center gap-1">
          <span class="i-lucide-user size-3" />
          POV
        </span>
        <span v-if="scene.locationId" class="flex items-center gap-1">
          <span class="i-lucide-map-pin size-3" />
          Location
        </span>
        <span v-if="moodDisplay" class="flex items-center gap-1">
          <span class="i-lucide-heart size-3" />
          {{ moodDisplay }}
        </span>
      </div>
    </div>

    <div class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
      <UButton
        icon="i-lucide-pencil"
        size="xs"
        variant="ghost"
        color="neutral"
        @click="emit('edit', scene)"
      />
      <UButton
        icon="i-lucide-trash-2"
        size="xs"
        variant="ghost"
        color="error"
        @click="emit('delete', scene.id)"
      />
    </div>
  </div>
</template>
