import { db } from "../../database"
import { books } from "../../database/schema"
import { eq } from "drizzle-orm"

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")
  const body = await readBody(event)

  const existing = db.select().from(books).where(eq(books.id, id!)).get()
  if (!existing) {
    throw createError({ statusCode: 404, message: "Book not found" })
  }

  const { title, genre, premise, targetWordCount, status, styleGuide } = body
  db.update(books)
    .set({
      ...(title !== undefined && { title }),
      ...(genre !== undefined && { genre }),
      ...(premise !== undefined && { premise }),
      ...(targetWordCount !== undefined && { targetWordCount }),
      ...(status !== undefined && { status }),
      ...(styleGuide !== undefined && { styleGuide }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(books.id, id!))
    .run()

  return db.select().from(books).where(eq(books.id, id!)).get()
})
