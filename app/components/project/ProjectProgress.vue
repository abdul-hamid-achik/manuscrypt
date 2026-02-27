<script setup lang="ts">
const props = defineProps<{
  current: number
  target: number
}>()

const percent = computed(() =>
  props.target > 0 ? Math.min(Math.round((props.current / props.target) * 100), 100) : 0,
)

function formatCount(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}
</script>

<template>
  <div class="space-y-1.5">
    <div class="h-1.5 w-full rounded-full bg-(--ui-bg-elevated)">
      <div
        class="h-full rounded-full bg-(--ui-primary) transition-all duration-500"
        :style="{ width: `${percent}%` }"
      />
    </div>
    <p class="text-xs text-(--ui-text-dimmed)">
      {{ formatCount(current) }} / {{ formatCount(target) }} words
    </p>
  </div>
</template>
