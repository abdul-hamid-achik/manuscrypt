import { z } from "zod"
import { db } from "../../../database"
import { aiMessages } from "../../../database/schema"
import { nanoid } from "nanoid"

const bodySchema = z.object({
  bookId: z.string().min(1),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1, "content must not be empty").max(100_000),
  chapterId: z.string().optional(),
  characterId: z.string().optional(),
  command: z.string().max(100).optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: `Invalid input: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
    })
  }

  const { bookId, role, content, characterId, chapterId, command } = parsed.data

  const id = nanoid()

  db.insert(aiMessages)
    .values({
      id,
      bookId,
      role,
      content,
      chapterId: chapterId ?? null,
      characterId: characterId ?? null,
      command: command ?? null,
    })
    .run()

  return { id }
})
