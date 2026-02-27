<script setup lang="ts">
const colorMode = useColorMode()

function toggle() {
  colorMode.preference = colorMode.value === "dark" ? "light" : "dark"
}
</script>

<template>
  <UButton
    :icon="colorMode.value === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'"
    variant="ghost"
    color="neutral"
    size="xs"
    aria-label="Toggle color mode"
    @click="toggle"
  />
</template>
