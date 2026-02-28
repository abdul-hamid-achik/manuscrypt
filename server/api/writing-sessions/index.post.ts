import { db } from "../../database"
import { writingSessions } from "../../database/schema"
import { nanoid } from "nanoid"
import { createWritingSessionSchema, parseBody } from "../../utils/validation"

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = parseBody(createWritingSessionSchema, body)

  const id = nanoid()

  db.insert(writingSessions)
    .values({
      id,
      bookId: data.bookId,
      chapterId: data.chapterId ?? null,
      wordsWritten: data.wordsWritten ?? 0,
      duration: data.duration ?? null,
      startedAt: data.startedAt ?? new Date().toISOString(),
      endedAt: data.endedAt ?? null,
    })
    .run()

  return { id }
})
