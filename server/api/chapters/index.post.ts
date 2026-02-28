import { db } from "../../database"
import { chapters } from "../../database/schema"
import { eq, max } from "drizzle-orm"
import { nanoid } from "nanoid"
import { createChapterSchema, parseBody } from "../../utils/validation"

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = parseBody(createChapterSchema, body)

  const id = nanoid()
  const now = new Date().toISOString()

  // Auto-assign sortOrder as max+1
  const maxOrder = db
    .select({ max: max(chapters.sortOrder) })
    .from(chapters)
    .where(eq(chapters.bookId, data.bookId))
    .get()

  const sortOrder = data.sortOrder ?? (maxOrder?.max ?? -1) + 1

  // Auto-assign chapter number if not provided
  const number = data.number ?? sortOrder + 1

  db.insert(chapters)
    .values({
      id,
      bookId: data.bookId,
      number,
      title: data.title ?? `Chapter ${number}`,
      synopsis: data.synopsis ?? null,
      content: data.content ?? null,
      wordCount: 0,
      status: "planned",
      act: data.act ?? null,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    })
    .run()

  return db.select().from(chapters).where(eq(chapters.id, id)).get()
})
