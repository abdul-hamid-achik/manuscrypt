<script setup lang="ts">
defineProps<{
  size?: "sm" | "md" | "lg"
}>()
</script>

<template>
  <div class="flex items-center gap-2">
    <svg
      :class="[
        size === 'lg' ? 'size-10' : size === 'sm' ? 'size-6' : 'size-8',
      ]"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="6" class="fill-stone-800 dark:fill-stone-900" />
      <text
        x="7"
        y="24"
        font-family="Georgia, serif"
        font-size="22"
        font-style="italic"
        font-weight="bold"
        class="fill-amber-500"
      >
        M
      </text>
    </svg>
    <span
      :class="[
        'font-serif font-semibold tracking-tight text-(--ui-primary)',
        size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-sm' : 'text-base',
      ]"
    >
      Manuscrypt
    </span>
  </div>
</template>
