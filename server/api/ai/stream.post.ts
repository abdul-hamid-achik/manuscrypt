import { createAnthropicClient, streamAnthropicResponse, streamAgenticResponse } from "../../utils/ai-stream"
import { buildBookContext, buildSystemPrompt, buildWriteScenePrompt, buildConsistencyCheckPrompt, buildReviewSuggestPrompt } from "../../utils/ai-prompts"
import { checkRateLimit } from "../../utils/rate-limit"
import { aiStreamSchema as bodySchema } from "../../utils/validation"
import { readOnlyTools, allTools } from "../../utils/ai-tools"

const agenticPromptBuilders: Record<string, (ctx: ReturnType<typeof buildBookContext>) => string> = {
  "write-scene": buildWriteScenePrompt,
  "consistency-check": buildConsistencyCheckPrompt,
  "review-suggest": buildReviewSuggestPrompt,
}

// Commands that can modify book data get all tools (read + write)
const writeAgentCommands = new Set(["write-scene", "review-suggest"])

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

  const { bookId, chapterId, messages, command, selectedText, agentMode } = parsed.data

  const anthropic = createAnthropicClient()
  const config = useRuntimeConfig()

  const bookContext = buildBookContext(bookId, chapterId)

  const apiMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  if (agentMode && command) {
    const promptBuilder = agenticPromptBuilders[command]
    const systemPrompt = promptBuilder
      ? promptBuilder(bookContext)
      : buildSystemPrompt(bookContext, command, selectedText)

    const tools = writeAgentCommands.has(command) ? allTools : readOnlyTools

    return streamAgenticResponse(event, anthropic, {
      model: config.anthropicSmartModel,
      maxTokens: 4096,
      system: systemPrompt,
      messages: apiMessages,
      tools,
      bookId,
    })
  }

  const systemPrompt = buildSystemPrompt(bookContext, command, selectedText)

  return streamAnthropicResponse(event, anthropic, {
    model: config.anthropicFastModel,
    maxTokens: 4096,
    system: systemPrompt,
    messages: apiMessages,
  })
})
