export function useWritingStats(bookId: string) {
  const sessionStartTime = ref<Date | null>(null)
  const sessionWordStart = ref(0)
  const wordsWrittenThisSession = ref(0)

  function startSession(currentWordCount: number) {
    sessionStartTime.value = new Date()
    sessionWordStart.value = currentWordCount
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
    if (!sessionStartTime.value) return

    const duration = Math.floor(
      (Date.now() - sessionStartTime.value.getTime()) / 1000,
    )

    try {
      await $fetch("/api/writing-sessions", {
        method: "POST",
        body: {
          bookId,
          chapterId,
          wordsWritten: wordsWrittenThisSession.value,
          duration,
          startedAt: sessionStartTime.value.toISOString(),
          endedAt: new Date().toISOString(),
        },
      })
    } catch {
      // Non-critical, don't block
    }

    sessionStartTime.value = null
    sessionWordStart.value = 0
    wordsWrittenThisSession.value = 0
  }

  return {
    sessionStartTime: readonly(sessionStartTime),
    wordsWrittenThisSession: readonly(wordsWrittenThisSession),
    sessionDurationFormatted,
    startSession,
    updateWordCount,
    endSession,
  }
}
