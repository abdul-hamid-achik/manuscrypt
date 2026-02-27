export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  command?: string
  timestamp: Date
}

interface ChatSession {
  messages: ChatMessage[]
  isStreaming: boolean
  streamedText: string
  error: string | null
  historyLoaded: boolean
}

function createSession(): ChatSession {
  return {
    messages: [],
    isStreaming: false,
    streamedText: "",
    error: null,
    historyLoaded: false,
  }
}

export const useAiChatStore = defineStore("aiChat", () => {
  const sessions = reactive<Record<string, ChatSession>>({})

  function getSession(key: string): ChatSession {
    if (!sessions[key]) {
      sessions[key] = createSession()
    }
    return sessions[key]
  }

  function clearSession(key: string) {
    sessions[key] = createSession()
  }

  return { sessions, getSession, clearSession }
})
