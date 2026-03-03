import { db } from "../../database"
import { writingSessions } from "../../database/schema"
import { eq } from "drizzle-orm"
import { parseBody, updateWritingSessionSchema } from "../../utils/validation"

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")
  if (!id) {
    throw createError({ statusCode: 400, message: "id is required" })
  }

  const body = await readBody(event)
  const data = parseBody(updateWritingSessionSchema, body)

  const existing = db.select().from(writingSessions).where(eq(writingSessions.id, id)).get()
  if (!existing) {
    throw createError({ statusCode: 404, message: "Writing session not found" })
  }

  const updates: Record<string, unknown> = {}
  if (data.wordsWritten !== undefined) updates.wordsWritten = data.wordsWritten
  if (data.duration !== undefined) updates.duration = data.duration
  if (data.endedAt !== undefined) updates.endedAt = data.endedAt

  if (Object.keys(updates).length > 0) {
    db.update(writingSessions)
      .set(updates)
      .where(eq(writingSessions.id, id))
      .run()
  }

  return db.select().from(writingSessions).where(eq(writingSessions.id, id)).get()
})
