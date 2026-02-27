import type { ChatMessage } from "~/stores/useAiChatStore"

interface AiContext {
  chapterId?: string
  selectedText?: string
}

export function useAiAssistant(
  bookId: string,
  characterId?: Ref<string | undefined> | (() => string | undefined),
) {
  const store = useAiChatStore()

  const resolvedCharId = computed(() =>
    typeof characterId === "function" ? characterId() : toValue(characterId),
  )

  const sessionKey = computed(() =>
    resolvedCharId.value
      ? `interview:${bookId}:${resolvedCharId.value}`
      : `general:${bookId}`,
  )

  const session = computed(() => store.getSession(sessionKey.value))

  const isStreaming = computed(() => session.value.isStreaming)
  const streamedText = computed(() => session.value.streamedText)
  const messages = computed(() => session.value.messages)
  const error = computed(() => session.value.error)
  const historyLoaded = computed(() => session.value.historyLoaded)

  async function saveMessage(msg: { role: string; content: string; characterId?: string; command?: string }) {
    try {
      await $fetch("/api/ai/messages", {
        method: "POST",
        body: { bookId, ...msg },
      })
    } catch {
      // Don't block chat on save failure
    }
  }

  async function loadHistory() {
    const s = session.value
    if (s.historyLoaded) return
    try {
      const params: Record<string, string> = { bookId }
      if (resolvedCharId.value) params.characterId = resolvedCharId.value
      const data = await $fetch<Array<{ id: string; role: string; content: string; command?: string; createdAt: string }>>("/api/ai/messages", {
        params,
      })
      s.messages = data.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        command: m.command ?? undefined,
        timestamp: new Date(m.createdAt),
      }))
      s.historyLoaded = true
    } catch {
      // Silently fail – start with empty history
    }
  }

  async function send(
    userMessage: string,
    context: AiContext = {},
    command?: string,
  ) {
    const s = session.value
    s.error = null
    s.isStreaming = true
    s.streamedText = ""

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: userMessage,
      command,
      timestamp: new Date(),
    }
    s.messages.push(userMsg)

    try {
      const response = await $fetch<ReadableStream>("/api/ai/stream", {
        method: "POST",
        body: {
          bookId,
          chapterId: context.chapterId,
          command,
          selectedText: context.selectedText,
          messages: s.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        },
        responseType: "stream",
      })

      let fullText = ""
      await readSseStream(response as ReadableStream, (data) => {
        if (data.type === "text") {
          fullText += data.content
          s.streamedText = fullText
        } else if (data.type === "error") {
          s.error = data.content ?? "Stream failed"
        }
      })

      if (fullText) {
        s.messages.push({
          id: crypto.randomUUID(),
          role: "assistant",
          content: fullText,
          command,
          timestamp: new Date(),
        })

        saveMessage({ role: "user", content: userMessage, command })
        saveMessage({ role: "assistant", content: fullText, command })
      }
    } catch (e) {
      s.error = e instanceof Error ? e.message : "Failed to connect to AI"
    } finally {
      s.isStreaming = false
    }
  }

  async function interviewCharacter(message: string) {
    const s = session.value
    const charId = resolvedCharId.value
    if (!charId) return ""

    s.error = null
    s.isStreaming = true
    s.streamedText = ""

    s.messages.push({
      id: crypto.randomUUID(),
      role: "user",
      content: message,
      timestamp: new Date(),
    })

    const history = s.messages.slice(0, -1).map((m) => ({
      role: m.role,
      content: m.content,
    }))

    try {
      const response = await $fetch<ReadableStream>("/api/ai/interview", {
        method: "POST",
        body: { bookId, characterId: charId, message, history },
        responseType: "stream",
      })

      let fullText = ""
      await readSseStream(response as ReadableStream, (data) => {
        if (data.type === "text") {
          fullText += data.content
          s.streamedText = fullText
        } else if (data.type === "error") {
          s.error = data.content ?? "Interview failed"
        }
      })

      if (fullText) {
        s.messages.push({
          id: crypto.randomUUID(),
          role: "assistant",
          content: fullText,
          timestamp: new Date(),
        })
        saveMessage({ role: "user", content: message, characterId: charId })
        saveMessage({ role: "assistant", content: fullText, characterId: charId })
      }

      return fullText
    } catch (e) {
      s.error = e instanceof Error ? e.message : "Interview failed"
      return ""
    } finally {
      s.isStreaming = false
    }
  }

  async function clearMessages() {
    store.clearSession(sessionKey.value)
    try {
      const params: Record<string, string> = { bookId }
      if (resolvedCharId.value) params.characterId = resolvedCharId.value
      await $fetch("/api/ai/messages", { method: "DELETE", params })
    } catch {
      // Best-effort server-side cleanup
    }
  }

  return {
    isStreaming,
    streamedText,
    messages,
    error,
    historyLoaded,
    send,
    interviewCharacter,
    loadHistory,
    clearMessages,
  }
}
