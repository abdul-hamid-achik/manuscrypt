import { z } from "zod"
import { createAnthropicClient, callAnthropicJson } from "../../utils/ai-stream"
import { checkRateLimit } from "../../utils/rate-limit"

const bodySchema = z.object({
  text: z.string().min(100, "Please provide at least 100 characters of text to analyze").max(50000, "Text must not exceed 50,000 characters"),
  bookId: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  checkRateLimit(event, { maxRequests: 20, windowMs: 60_000 })

  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: `Invalid input: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
    })
  }

  const { text } = parsed.data

  const anthropic = createAnthropicClient()
  const config = useRuntimeConfig()

  return callAnthropicJson(anthropic, {
    model: config.anthropicSmartModel,
    maxTokens: 2048,
    system: `You are a literary style analyst. Analyze the provided text and return a JSON object with these exact fields:
- sentenceLengthAvg (number): average words per sentence
- vocabularyRichness (number 0-1): type-token ratio (unique words / total words)
- dialogueRatio (number 0-1): estimated proportion of text that is dialogue
- toneDescription (string): 2-3 sentence description of the overall tone
- paceDescription (string): 2-3 sentence description of the pacing and rhythm
- strengths (string array): 3-4 specific strengths of the prose
- suggestions (string array): 3-5 specific, actionable craft suggestions for improvement
- comparableAuthors (string array): 2-3 authors whose style this most resembles

Return ONLY valid JSON, no markdown code fences, no other text.`,
    messages: [
      { role: "user", content: `Analyze the literary style of this text:\n\n${text}` },
    ],
    errorLabel: "style analysis",
  })
})
