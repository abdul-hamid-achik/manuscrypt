import { db } from "../../database"
import { writingSessions } from "../../database/schema"
import { nanoid } from "nanoid"

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.bookId) {
    throw createError({ statusCode: 400, message: "bookId is required" })
  }

  const id = nanoid()

  db.insert(writingSessions)
    .values({
      id,
      bookId: body.bookId,
      chapterId: body.chapterId ?? null,
      wordsWritten: body.wordsWritten ?? 0,
      duration: body.duration ?? null,
      startedAt: body.startedAt ?? new Date().toISOString(),
      endedAt: body.endedAt ?? null,
    })
    .run()

  return { id }
})
