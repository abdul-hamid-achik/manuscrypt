<script setup lang="ts">
defineProps<{
  wordCount: number
  characterCount: number
  saveStatus: string
}>()
</script>

<template>
  <div class="flex items-center justify-between px-4 py-1.5 border-t border-(--ui-border) text-xs text-(--ui-text-dimmed)">
    <div class="flex items-center gap-4">
      <span>{{ wordCount.toLocaleString() }} words</span>
      <span>{{ characterCount.toLocaleString() }} characters</span>
    </div>
    <div class="flex items-center gap-2">
      <span
        v-if="saveStatus"
        :class="{
          'text-(--ui-text-highlighted)': saveStatus === 'Saved',
          'text-(--ui-warning)': saveStatus === 'Saving...',
          'text-(--ui-error)': saveStatus === 'Error saving',
        }"
      >
        {{ saveStatus }}
      </span>
    </div>
  </div>
</template>
