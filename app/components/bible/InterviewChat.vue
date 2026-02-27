<script setup lang="ts">
const props = defineProps<{
  bookId: string
  characterId: string
  characterName: string
}>()
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="border-b border-(--ui-border) px-4 py-3">
      <h3 class="font-serif text-lg font-semibold text-(--ui-text-highlighted)">
        Interview with {{ characterName }}
      </h3>
      <p class="text-xs text-(--ui-text-dimmed) mt-0.5">
        Speak with this character in their own voice
      </p>
    </div>

    <div class="flex-1 min-h-0">
      <AgentChat
        :book-id="bookId"
        :character-id="characterId"
      />
    </div>
  </div>
</template>
