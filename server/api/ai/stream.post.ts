import { z } from "zod"
import { createAnthropicClient, streamAnthropicResponse } from "../../utils/ai-stream"
import { buildBookContext, buildSystemPrompt } from "../../utils/ai-prompts"
import { checkRateLimit } from "../../utils/rate-limit"

const bodySchema = z.object({
  bookId: z.string(),
  chapterId: z.string().optional(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ),
  command: z.string().optional(),
  selectedText: z.string().optional(),
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

  const { bookId, chapterId, messages, command, selectedText } = parsed.data

  const anthropic = createAnthropicClient()
  const config = useRuntimeConfig()

  const bookContext = buildBookContext(bookId, chapterId)
  const systemPrompt = buildSystemPrompt(bookContext, command, selectedText)

  return streamAnthropicResponse(event, anthropic, {
    model: config.anthropicFastModel,
    maxTokens: 4096,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  })
})
