import { db } from "../../database"
import { chapters } from "../../database/schema"
import { eq, max } from "drizzle-orm"
import { nanoid } from "nanoid"

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.bookId) {
    throw createError({ statusCode: 400, message: "bookId is required" })
  }

  const id = nanoid()
  const now = new Date().toISOString()

  // Auto-assign sortOrder as max+1
  const maxOrder = db
    .select({ max: max(chapters.sortOrder) })
    .from(chapters)
    .where(eq(chapters.bookId, body.bookId))
    .get()

  const sortOrder = (maxOrder?.max ?? -1) + 1

  // Auto-assign chapter number if not provided
  const number = body.number ?? sortOrder + 1

  db.insert(chapters)
    .values({
      id,
      bookId: body.bookId,
      number,
      title: body.title ?? `Chapter ${number}`,
      synopsis: body.synopsis ?? null,
      content: body.content ?? null,
      wordCount: 0,
      status: "planned",
      act: body.act ?? null,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    })
    .run()

  return db.select().from(chapters).where(eq(chapters.id, id)).get()
})
