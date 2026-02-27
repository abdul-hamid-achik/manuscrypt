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

  async function analyze(text: string) {
    isAnalyzing.value = true
    error.value = null
    analysis.value = null
    try {
      analysis.value = await $fetch<StyleAnalysis>('/api/ai/style-analyze', {
        method: 'POST',
        body: { text },
      })
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Style analysis failed'
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
