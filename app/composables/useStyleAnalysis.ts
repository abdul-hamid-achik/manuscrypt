export interface StyleAnalysis {
  sentenceLengthAvg: number
  vocabularyRichness: number
  dialogueRatio: number
  toneDescription: string
  paceDescription: string
  strengths: string[]
  suggestions: string[]
  comparableAuthors: string[]
}

export function useStyleAnalysis() {
  const isAnalyzing = ref(false)
  const analysis = ref<StyleAnalysis | null>(null)
  const error = ref<string | null>(null)

  async function analyze(text: string, bookId?: string) {
    isAnalyzing.value = true
    error.value = null
    analysis.value = null
    try {
      analysis.value = await $fetch<StyleAnalysis>('/api/ai/style-analyze', {
        method: 'POST',
        body: { text, bookId },
      })
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'data' in e) {
        const err = e as { data?: { message?: unknown } }
        if (typeof err.data?.message === 'string') {
          error.value = err.data.message
          return
        }
      }

      if (e && typeof e === 'object' && 'message' in e) {
        const err = e as { message?: unknown }
        error.value = typeof err.message === 'string' ? err.message : 'Style analysis failed'
        return
      }

      error.value = 'Style analysis failed'
    } finally {
      isAnalyzing.value = false
    }
  }

  function reset() {
    analysis.value = null
    error.value = null
  }

  return { isAnalyzing, analysis, error, analyze, reset }
}
