import { z } from "zod"
import { db } from "../../database"
import { characters } from "../../database/schema"
import { eq } from "drizzle-orm"
import { createAnthropicClient, streamAnthropicResponse } from "../../utils/ai-stream"
import { checkRateLimit } from "../../utils/rate-limit"

const bodySchema = z.object({
  bookId: z.string(),
  characterId: z.string(),
  message: z.string().min(1, "message must not be empty"),
  history: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ),
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

  const { characterId, message, history } = parsed.data

  const anthropic = createAnthropicClient()
  const config = useRuntimeConfig()

  const character = db.select().from(characters).where(eq(characters.id, characterId)).get()
  if (!character) {
    throw createError({ statusCode: 404, message: "Character not found" })
  }

  let systemPrompt = `You ARE ${character.name}. Respond as this character would — in their voice, with their mannerisms, beliefs, and emotional patterns.`
  if (character.description) systemPrompt += `\n\nAbout you: ${character.description}`
  if (character.motivation) systemPrompt += `\nWhat drives you: ${character.motivation}`
  if (character.fear) systemPrompt += `\nWhat you fear: ${character.fear}`
  if (character.contradiction) systemPrompt += `\nYour internal conflict: ${character.contradiction}`
  if (character.voiceNotes) systemPrompt += `\nHow you speak: ${character.voiceNotes}`
  if (character.backstory) systemPrompt += `\nYour history: ${character.backstory}`
  systemPrompt += `\n\nStay fully in character. Respond naturally as ${character.name} would. Reveal personality, backstory, and motivations through conversation. Never break character or acknowledge you are an AI.`

  const messages_arr: Array<{ role: "user" | "assistant"; content: string }> = [
    ...history,
    { role: "user" as const, content: message },
  ]

  return streamAnthropicResponse(event, anthropic, {
    model: config.anthropicSmartModel,
    maxTokens: 2048,
    system: systemPrompt,
    messages: messages_arr,
  })
})
