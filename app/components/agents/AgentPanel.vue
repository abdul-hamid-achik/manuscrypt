<script setup lang="ts">
export interface SelectionSnapshot {
  text: string
  from: number
  to: number
}

const props = defineProps<{
  bookId: string
  chapterId: string
  getEditorSnapshot?: () => SelectionSnapshot | null
}>()

const isExpanded = ref(true)
const chatInput = ref("")
const messagesContainer = ref<HTMLElement | null>(null)

const { isStreaming, streamedText, messages, error, send, clearMessages, loadHistory } =
  useAiAssistant(props.bookId)

// Load persisted general chat history on mount
onMounted(() => loadHistory())

// --- Selection snapshot system ---
// Captured eagerly when the user focuses the chat input (before editor loses focus)
const capturedSelection = ref<SelectionSnapshot | null>(null)

// Track which assistant message was generated from which selection range
const messageSelections = new Map<string, SelectionSnapshot>()

function captureSelection() {
  capturedSelection.value = props.getEditorSnapshot?.() ?? null
}

async function sendMessage() {
  const message = chatInput.value.trim()
  if (!message || isStreaming.value) return

  chatInput.value = ""
  const selection = capturedSelection.value
  const selectedText = selection?.text || undefined

  const msgCountBefore = messages.value.length
  await send(message, { chapterId: props.chapterId, selectedText })

  // Associate the selection range with the new assistant message
  if (selection && messages.value.length > msgCountBefore) {
    const lastMsg = messages.value.at(-1)
    if (lastMsg?.role === "assistant") {
      messageSelections.set(lastMsg.id, selection)
    }
  }

  // Scroll to bottom
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

async function executeCommand(command: string, selectedText?: string) {
  // If no selectedText was passed (e.g. from in-panel command menu), use captured selection
  const resolvedText = selectedText || capturedSelection.value?.text || undefined
  const selection = selectedText
    ? null // called from page-level handler, positions aren't tracked here
    : capturedSelection.value

  const userMessage =
    resolvedText
      ? `[/${command}] ${resolvedText}`
      : `/${command}`

  const msgCountBefore = messages.value.length
  await send(userMessage, { chapterId: props.chapterId, selectedText: resolvedText }, command)

  if (selection && messages.value.length > msgCountBefore) {
    const lastMsg = messages.value.at(-1)
    if (lastMsg?.role === "assistant") {
      messageSelections.set(lastMsg.id, selection)
    }
  }

  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function handleReplace(msgId: string, content: string) {
  const selection = messageSelections.get(msgId)
  if (selection) {
    emit("replace", content, selection.from, selection.to)
  } else {
    // Fallback: replace whatever is currently selected
    emit("replace", content, -1, -1)
  }
}

// Auto-scroll on streaming
watch(streamedText, async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
})

const emit = defineEmits<{
  insert: [text: string]
  replace: [text: string, from: number, to: number]
}>()

defineExpose({ executeCommand })
</script>

<template>
  <div
    class="flex flex-col h-full border-l border-(--ui-border) bg-(--ui-bg)"
    :class="isExpanded ? 'w-96' : 'w-12'"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-(--ui-border)">
      <template v-if="isExpanded">
        <h3 class="text-sm font-semibold text-(--ui-text-highlighted)">
          Writing Assistant
        </h3>
        <div class="flex items-center gap-1">
          <UButton
            icon="i-lucide-trash-2"
            variant="ghost"
            size="xs"
            color="neutral"
            aria-label="Clear chat"
            @click="clearMessages"
          />
          <UButton
            icon="i-lucide-panel-right-close"
            variant="ghost"
            size="xs"
            color="neutral"
            aria-label="Collapse panel"
            @click="isExpanded = false"
          />
        </div>
      </template>
      <UButton
        v-else
        icon="i-lucide-panel-right-open"
        variant="ghost"
        size="xs"
        color="neutral"
        aria-label="Expand panel"
        @click="isExpanded = true"
      />
    </div>

    <template v-if="isExpanded">
      <!-- Messages -->
      <div
        ref="messagesContainer"
        class="flex-1 overflow-y-auto p-3 space-y-3 writing-area"
      >
        <!-- Empty state -->
        <div
          v-if="messages.length === 0 && !isStreaming"
          class="flex flex-col items-center justify-center h-full text-center px-4"
        >
          <UIcon
            name="i-lucide-sparkles"
            class="text-3xl text-(--ui-primary) mb-3"
          />
          <p class="text-sm text-(--ui-text-dimmed) mb-1">
            Your writing assistant
          </p>
          <p class="text-xs text-(--ui-text-muted)">
            Ask for help, use AI commands, or just chat about your story
          </p>
        </div>

        <!-- Messages list -->
        <div
          v-for="msg in messages"
          :key="msg.id"
          :class="[
            'rounded-lg px-3 py-2 text-sm group',
            msg.role === 'user'
              ? 'bg-(--ui-primary)/10 ml-8'
              : 'bg-(--ui-bg-elevated) mr-4',
          ]"
        >
          <div
            v-if="msg.command"
            class="text-xs font-mono text-(--ui-primary) mb-1"
          >
            /{{ msg.command }}
          </div>
          <div class="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {{ msg.content }}
          </div>
          <div
            v-if="msg.role === 'assistant'"
            class="mt-1.5 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <UButton
              icon="i-lucide-replace"
              size="xs"
              variant="ghost"
              color="neutral"
              label="Replace selection"
              @click="handleReplace(msg.id, msg.content)"
            />
            <UButton
              icon="i-lucide-arrow-down-to-dot"
              size="xs"
              variant="ghost"
              color="neutral"
              label="Insert into editor"
              @click="emit('insert', msg.content)"
            />
          </div>
        </div>

        <!-- Streaming indicator -->
        <div
          v-if="isStreaming"
          class="bg-(--ui-bg-elevated) rounded-lg px-3 py-2 text-sm mr-4"
        >
          <div class="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {{ streamedText }}
            <span class="inline-block w-1.5 h-4 bg-(--ui-primary) animate-pulse ml-0.5" />
          </div>
        </div>

        <!-- Error -->
        <div
          v-if="error"
          class="bg-red-500/10 text-red-400 rounded-lg px-3 py-2 text-sm"
        >
          {{ error }}
        </div>
      </div>

      <!-- Input -->
      <div class="p-3 border-t border-(--ui-border)">
        <div class="flex items-end gap-2">
          <AiCommandMenu @command="(cmd) => executeCommand(cmd)" />
          <UTextarea
            v-model="chatInput"
            :placeholder="capturedSelection ? 'Ask about your selection...' : 'Ask about your story...'"
            :rows="1"
            autoresize
            class="flex-1"
            @focus="captureSelection"
            @keydown.enter.exact.prevent="sendMessage"
          />
          <UButton
            icon="i-lucide-send"
            size="sm"
            :loading="isStreaming"
            :disabled="!chatInput.trim() || isStreaming"
            @click="sendMessage"
          />
        </div>
        <!-- Selection indicator -->
        <div
          v-if="capturedSelection"
          class="mt-1.5 text-xs text-(--ui-text-muted) truncate"
        >
          Selected: "{{ capturedSelection.text.slice(0, 80) }}{{ capturedSelection.text.length > 80 ? '...' : '' }}"
        </div>
      </div>
    </template>
  </div>
</template>
