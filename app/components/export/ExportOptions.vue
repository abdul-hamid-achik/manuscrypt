<script setup lang="ts">
defineProps<{
  format: string
  description: string
  icon: string
}>()

const emit = defineEmits<{
  export: []
}>()
</script>

<template>
  <UCard>
    <div class="flex items-start gap-4">
      <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-(--ui-bg-elevated)">
        <span :class="[icon, 'size-5 text-(--ui-primary)']" />
      </div>
      <div class="flex-1">
        <h3 class="font-semibold text-(--ui-text-highlighted)">{{ format }}</h3>
        <p class="mt-1 text-sm text-(--ui-text-muted)">{{ description }}</p>
        <UButton
          label="Download"
          icon="i-lucide-download"
          size="sm"
          variant="soft"
          class="mt-3"
          @click="emit('export')"
        />
      </div>
    </div>
  </UCard>
</template>
