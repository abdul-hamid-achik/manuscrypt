import { z } from "zod"
import { db } from "../../database"
import { chapters } from "../../database/schema"
import { eq } from "drizzle-orm"
import { createAnthropicClient, callAnthropicJson } from "../../utils/ai-stream"
import { checkRateLimit } from "../../utils/rate-limit"

const bodySchema = z.object({
  chapterId: z.string(),
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

  const { chapterId } = parsed.data

  const anthropic = createAnthropicClient()
  const config = useRuntimeConfig()

  const chapter = db.select().from(chapters).where(eq(chapters.id, chapterId)).get()

  if (!chapter) {
    throw createError({ statusCode: 404, message: "Chapter not found" })
  }

  if (!chapter.content || chapter.content.trim().length < 50) {
    throw createError({ statusCode: 400, message: "Chapter needs at least 50 characters of content to review" })
  }

  return callAnthropicJson(anthropic, {
    model: config.anthropicSmartModel,
    maxTokens: 2048,
    system: `You are a professional manuscript reviewer and literary editor. Analyze the provided chapter text and return a JSON object with these exact fields:
- overallImpression (string): 2-3 sentence summary of the chapter's quality and impact
- proseQuality (object with "score" as number 1-10 and "feedback" as string): evaluate clarity, elegance, and literary merit of the writing
- pacing (object with "score" as number 1-10 and "feedback" as string): evaluate narrative rhythm, scene transitions, and momentum
- dialogue (object with "score" as number 1-10 and "feedback" as string): evaluate authenticity, subtext, and character distinction in dialogue
- characterVoice (object with "score" as number 1-10 and "feedback" as string): evaluate consistency and distinctiveness of character voices
- suggestions (string array): 3-5 specific, actionable improvements the author can make

Be honest but constructive. Give specific examples from the text when possible.
Return ONLY valid JSON, no markdown code fences, no other text.`,
    messages: [
      { role: "user", content: `Review this chapter titled "${chapter.title}":\n\n${chapter.content}` },
    ],
    errorLabel: "review",
  })
})
