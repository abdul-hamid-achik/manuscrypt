import { db } from "../../database"
import { books } from "../../database/schema"
import { eq } from "drizzle-orm"
import { updateBookSchema, parseBody } from "../../utils/validation"

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")
  const body = await readBody(event)
  const data = parseBody(updateBookSchema, body)

  const existing = db.select().from(books).where(eq(books.id, id!)).get()
  if (!existing) {
    throw createError({ statusCode: 404, message: "Book not found" })
  }

  db.update(books)
    .set({
      ...(data.title !== undefined && { title: data.title }),
      ...(data.genre !== undefined && { genre: data.genre }),
      ...(data.premise !== undefined && { premise: data.premise }),
      ...(data.targetWordCount !== undefined && { targetWordCount: data.targetWordCount }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.styleGuide !== undefined && { styleGuide: data.styleGuide }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(books.id, id!))
    .run()

  return db.select().from(books).where(eq(books.id, id!)).get()
})
