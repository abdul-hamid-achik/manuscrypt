import { db } from "../../../database"
import { aiMessages } from "../../../database/schema"
import { nanoid } from "nanoid"
import { aiMessageSchema as bodySchema } from "../../../utils/validation"

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
