<script setup lang="ts">
const props = defineProps<{
  bookId: string
  characterId?: string
}>()

const input = ref("")
const messagesEl = ref<HTMLElement | null>(null)

const { isStreaming, streamedText, error, interviewCharacter, loadHistory, messages } =
  useAiAssistant(props.bookId, () => props.characterId)

// Load history when characterId changes — store prevents redundant fetches
watch(
  () => props.characterId,
  (charId) => {
    if (charId) loadHistory()
  },
  { immediate: true },
)

async function sendMessage() {
  const message = input.value.trim()
  if (!message || isStreaming.value || !props.characterId) return

  input.value = ""
  await interviewCharacter(message)

  await nextTick()
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
}

watch(streamedText, async () => {
  await nextTick()
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Messages -->
    <div
      ref="messagesEl"
      class="flex-1 overflow-y-auto p-4 space-y-3 writing-area"
    >
      <div
        v-if="messages.length === 0 && !isStreaming"
        class="flex items-center justify-center h-full text-(--ui-text-muted) text-sm"
      >
        Start a conversation with this character...
      </div>

      <div
        v-for="msg in messages"
        :key="msg.id"
        :class="[
          'rounded-lg px-3 py-2 text-sm',
          msg.role === 'user'
            ? 'bg-(--ui-primary)/10 ml-8'
            : 'bg-(--ui-bg-elevated) mr-4 font-serif italic',
        ]"
      >
        {{ msg.content }}
      </div>

      <div
        v-if="isStreaming"
        class="bg-(--ui-bg-elevated) rounded-lg px-3 py-2 text-sm mr-4 font-serif italic"
      >
        {{ streamedText }}
        <span class="inline-block w-1.5 h-4 bg-(--ui-primary) animate-pulse ml-0.5" />
      </div>

      <div
        v-if="error"
        class="bg-red-500/10 text-red-400 rounded-lg px-3 py-2 text-sm"
      >
        {{ error }}
      </div>
    </div>

    <!-- Input -->
    <div class="p-3 border-t border-(--ui-border)">
      <div class="flex gap-2">
        <UInput
          v-model="input"
          placeholder="Ask the character..."
          class="flex-1"
          @keydown.enter.prevent="sendMessage"
        />
        <UButton
          icon="i-lucide-send"
          size="sm"
          :loading="isStreaming"
          :disabled="!input.trim() || isStreaming"
          @click="sendMessage"
        />
      </div>
    </div>
  </div>
</template>
