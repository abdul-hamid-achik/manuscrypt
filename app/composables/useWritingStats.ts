export function useWritingStats(bookId: string) {
  const sessionStartTime = ref<Date | null>(null)
  const sessionWordStart = ref(0)
  const wordsWrittenThisSession = ref(0)
  const isEndingSession = ref(false)
  const currentSessionId = ref<string | null>(null)
  const currentSessionChapterId = ref<string | null>(null)

  function buildSessionPayload(chapterId?: string) {
    if (!sessionStartTime.value) return null

    return {
      id: currentSessionId.value ?? undefined,
      bookId,
      chapterId: chapterId ?? currentSessionChapterId.value ?? undefined,
      wordsWritten: Math.max(0, wordsWrittenThisSession.value),
      duration: Math.floor(
        (Date.now() - sessionStartTime.value.getTime()) / 1000,
      ),
      startedAt: sessionStartTime.value.toISOString(),
      endedAt: new Date().toISOString(),
    }
  }

  function clearSessionState() {
    sessionStartTime.value = null
    sessionWordStart.value = 0
    wordsWrittenThisSession.value = 0
    currentSessionId.value = null
    currentSessionChapterId.value = null
    isEndingSession.value = false
  }

  async function startSession(currentWordCount: number, chapterId?: string) {
    sessionStartTime.value = new Date()
    sessionWordStart.value = Number.isFinite(currentWordCount) ? currentWordCount : 0
    currentSessionChapterId.value = chapterId ?? null

    const startedAt = sessionStartTime.value.toISOString()
    try {
      const response = await $fetch<{ id: string }>("/api/writing-sessions", {
        method: "POST",
        body: {
          bookId,
          chapterId,
          wordsWritten: 0,
          duration: 0,
          startedAt,
        },
      })
      currentSessionId.value = response.id
    } catch {
      currentSessionId.value = null
    }
  }

  function updateWordCount(currentWordCount: number) {
    wordsWrittenThisSession.value = Math.max(
      0,
      currentWordCount - sessionWordStart.value,
    )
  }

  const sessionDurationFormatted = computed(() => {
    if (!sessionStartTime.value) return "0m"
    const total = Math.floor(
      (Date.now() - sessionStartTime.value.getTime()) / 1000,
    )
    const hours = Math.floor(total / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  })

  async function endSession(chapterId?: string) {
    if (isEndingSession.value || !sessionStartTime.value) return
    isEndingSession.value = true
    const payload = buildSessionPayload(chapterId)
    if (!payload) {
      clearSessionState()
      return
    }

    try {
      if (payload.id) {
        await $fetch(`/api/writing-sessions/${payload.id}`, {
          method: "PUT",
          body: {
            wordsWritten: payload.wordsWritten,
            duration: payload.duration,
            endedAt: payload.endedAt,
          },
        })
      } else {
        await $fetch("/api/writing-sessions", {
          method: "POST",
          body: {
            bookId: payload.bookId,
            chapterId: payload.chapterId,
            wordsWritten: payload.wordsWritten,
            duration: payload.duration,
            startedAt: payload.startedAt,
            endedAt: payload.endedAt,
          },
        })
      }
    } catch {
      // Non-critical, don't block
    } finally {
      clearSessionState()
    }
  }

  function endSessionForUnload(chapterId?: string) {
    const payload = buildSessionPayload(chapterId)
    if (!payload || typeof window === "undefined") return

    const endpoint = "/api/writing-sessions/flush"
    const body = JSON.stringify(payload)
    const blob = new Blob([body], { type: "application/json" })

    if (typeof navigator.sendBeacon === "function" && navigator.sendBeacon(endpoint, blob)) {
      clearSessionState()
      return
    }

    void fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {
      // Best effort; avoid blocking unload
    })

    clearSessionState()
  }

  return {
    sessionStartTime: readonly(sessionStartTime),
    wordsWrittenThisSession: readonly(wordsWrittenThisSession),
    sessionDurationFormatted,
    startSession,
    updateWordCount,
    endSession,
    endSessionForUnload,
  }
}
