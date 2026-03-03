import { db } from "../../database"
import { contentSnapshots } from "../../database/schema"
import { createSnapshotSchema, parseBody } from "../../utils/validation"

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = parseBody(createSnapshotSchema, body)

  const result = db
    .insert(contentSnapshots)
    .values({
      chapterId: data.chapterId,
      content: data.content,
      wordCount: data.wordCount,
      label: data.label,
    })
    .returning()
    .get()

  return result
})
