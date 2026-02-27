<script setup lang="ts">
import type { Location } from '~~/shared/types'

defineProps<{
  location: Location
}>()
</script>

<template>
  <UCard
    class="h-full transition-colors duration-200 hover:ring-(--ui-primary)/40 cursor-pointer"
  >
    <div class="space-y-3">
      <div class="flex items-start justify-between gap-2">
        <h3 class="font-serif text-lg font-semibold text-(--ui-text-highlighted) leading-snug">
          {{ location.name }}
        </h3>
        <UBadge
          v-if="location.emotionalTone"
          variant="subtle"
          size="sm"
          class="capitalize shrink-0"
        >
          {{ location.emotionalTone }}
        </UBadge>
      </div>

      <p
        v-if="location.description"
        class="text-sm text-(--ui-text-muted) line-clamp-2"
      >
        {{ location.description }}
      </p>

      <p
        v-if="location.sensoryDetails"
        class="text-xs text-(--ui-text-dimmed) italic line-clamp-1"
      >
        {{ location.sensoryDetails }}
      </p>
    </div>
  </UCard>
</template>
