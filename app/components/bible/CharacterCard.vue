<script setup lang="ts">
import type { Character } from '~~/shared/types'

defineProps<{
  character: Character
}>()

const roleColor = computed(() => {
  return (role: string | null) => {
    const colors: Record<string, string> = {
      protagonist: 'amber',
      antagonist: 'red',
      supporting: 'info',
      minor: 'neutral',
    }
    return colors[role ?? ''] || 'neutral'
  }
})
</script>

<template>
  <UCard
    class="h-full transition-colors duration-200 hover:ring-(--ui-primary)/40 cursor-pointer"
  >
    <div class="space-y-3">
      <div class="flex items-start justify-between gap-2">
        <h3 class="font-serif text-lg font-semibold text-(--ui-text-highlighted) leading-snug">
          {{ character.name }}
        </h3>
        <UBadge
          v-if="character.role"
          :color="roleColor(character.role) as any"
          variant="subtle"
          size="sm"
          class="capitalize shrink-0"
        >
          {{ character.role }}
        </UBadge>
      </div>

      <p
        v-if="character.archetype"
        class="text-xs font-medium uppercase tracking-wider text-(--ui-text-dimmed)"
      >
        {{ character.archetype }}
      </p>

      <p
        v-if="character.description"
        class="text-sm text-(--ui-text-muted) line-clamp-2"
      >
        {{ character.description }}
      </p>

      <p
        v-if="character.motivation"
        class="text-sm italic text-(--ui-text-dimmed) line-clamp-1"
      >
        &ldquo;{{ character.motivation }}&rdquo;
      </p>
    </div>
  </UCard>
</template>
