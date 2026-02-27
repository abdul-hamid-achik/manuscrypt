import { db } from "../../database"
import { books } from "../../database/schema"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.title) {
    throw createError({ statusCode: 400, message: "Title is required" })
  }

  const id = nanoid()
  const now = new Date().toISOString()

  db.insert(books)
    .values({
      id,
      title: body.title,
      genre: body.genre ?? null,
      premise: body.premise ?? null,
      targetWordCount: body.targetWordCount ?? 80000,
      status: "planning",
      styleGuide: body.styleGuide ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run()

  return db.select().from(books).where(eq(books.id, id)).get()
})
