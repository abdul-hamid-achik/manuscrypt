import { db } from "../../database"
import { writingSessions } from "../../database/schema"
import { parseBody, flushWritingSessionSchema } from "../../utils/validation"
import { nanoid } from "nanoid"
import { eq } from "drizzle-orm"

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = parseBody(flushWritingSessionSchema, body)

  const payload = {
    bookId: data.bookId,
    chapterId: data.chapterId ?? null,
    wordsWritten: data.wordsWritten ?? 0,
    duration: data.duration ?? 0,
    startedAt: data.startedAt ?? new Date().toISOString(),
    endedAt: data.endedAt ?? new Date().toISOString(),
  }

  if (data.id) {
    const existing = db
      .select()
      .from(writingSessions)
      .where(eq(writingSessions.id, data.id))
      .get()

    if (existing) {
      db.update(writingSessions)
        .set({
          wordsWritten: payload.wordsWritten,
          duration: payload.duration,
          endedAt: payload.endedAt,
        })
        .where(eq(writingSessions.id, data.id))
        .run()

      return { id: data.id }
    }
  }

  const id = data.id ?? nanoid()
  db.insert(writingSessions)
    .values({
      id,
      bookId: payload.bookId,
      chapterId: payload.chapterId,
      wordsWritten: payload.wordsWritten,
      duration: payload.duration,
      startedAt: payload.startedAt,
      endedAt: payload.endedAt,
    })
    .run()

  return { id }
})
