import { db } from "../../database"
import { books } from "../../database/schema"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { createBookSchema, parseBody } from "../../utils/validation"

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = parseBody(createBookSchema, body)

  const id = nanoid()
  const now = new Date().toISOString()

  db.insert(books)
    .values({
      id,
      title: data.title,
      genre: data.genre ?? null,
      premise: data.premise ?? null,
      targetWordCount: data.targetWordCount ?? 80000,
      status: "planning",
      styleGuide: data.styleGuide ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run()

  return db.select().from(books).where(eq(books.id, id)).get()
})
