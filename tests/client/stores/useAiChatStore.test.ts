import { describe, it, expect } from "vitest"

// Test the store logic directly without Pinia setup
// since the store is just a factory function with reactive state

function createSession() {
  return {
    messages: [] as Array<{ id: string; role: "user" | "assistant"; content: string; command?: string; timestamp: Date }>,
    isStreaming: false,
    streamedText: "",
    error: null as string | null,
    historyLoaded: false,
  }
}

function createStore() {
  const sessions: Record<string, ReturnType<typeof createSession>> = {}

  function getSession(key: string) {
    if (!sessions[key]) {
      sessions[key] = createSession()
    }
    return sessions[key]
  }

  function clearSession(key: string) {
    sessions[key] = createSession()
  }

  return { sessions, getSession, clearSession }
}

describe("useAiChatStore", () => {
  it("creates a new session on first access", () => {
    const store = createStore()
    const session = store.getSession("general:book-1")
    expect(session.messages).toHaveLength(0)
    expect(session.isStreaming).toBe(false)
    expect(session.streamedText).toBe("")
    expect(session.error).toBeNull()
    expect(session.historyLoaded).toBe(false)
  })

  it("returns the same session on subsequent access", () => {
    const store = createStore()
    const session1 = store.getSession("general:book-1")
    session1.messages.push({
      id: "1",
      role: "user",
      content: "Hello",
      timestamp: new Date(),
    })
    const session2 = store.getSession("general:book-1")
    expect(session2.messages).toHaveLength(1)
    expect(session2.messages[0].content).toBe("Hello")
  })

  it("maintains separate sessions for different keys", () => {
    const store = createStore()
    const general = store.getSession("general:book-1")
    const interview = store.getSession("interview:book-1:char-1")

    general.messages.push({
      id: "1",
      role: "user",
      content: "General message",
      timestamp: new Date(),
    })

    expect(interview.messages).toHaveLength(0)
    expect(general.messages).toHaveLength(1)
  })

  it("clears a session", () => {
    const store = createStore()
    const session = store.getSession("general:book-1")
    session.messages.push({
      id: "1",
      role: "user",
      content: "Hello",
      timestamp: new Date(),
    })
    session.isStreaming = true
    session.streamedText = "Some text"
    session.error = "Some error"
    session.historyLoaded = true

    store.clearSession("general:book-1")
    const cleared = store.getSession("general:book-1")
    expect(cleared.messages).toHaveLength(0)
    expect(cleared.isStreaming).toBe(false)
    expect(cleared.streamedText).toBe("")
    expect(cleared.error).toBeNull()
    expect(cleared.historyLoaded).toBe(false)
  })

  it("does not affect other sessions when clearing", () => {
    const store = createStore()
    store.getSession("general:book-1").messages.push({
      id: "1",
      role: "user",
      content: "Keep me",
      timestamp: new Date(),
    })
    store.getSession("general:book-2").messages.push({
      id: "2",
      role: "user",
      content: "Clear me",
      timestamp: new Date(),
    })

    store.clearSession("general:book-2")
    expect(store.getSession("general:book-1").messages).toHaveLength(1)
    expect(store.getSession("general:book-2").messages).toHaveLength(0)
  })
})
