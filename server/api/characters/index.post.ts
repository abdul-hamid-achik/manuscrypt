import { db } from "../../database"
import { characters } from "../../database/schema"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.bookId) {
    throw createError({ statusCode: 400, message: "bookId is required" })
  }
  if (!body.name) {
    throw createError({ statusCode: 400, message: "name is required" })
  }

  const id = nanoid()
  const now = new Date().toISOString()

  db.insert(characters)
    .values({
      id,
      bookId: body.bookId,
      name: body.name,
      role: body.role ?? null,
      age: body.age ?? null,
      archetype: body.archetype ?? null,
      description: body.description ?? null,
      motivation: body.motivation ?? null,
      fear: body.fear ?? null,
      contradiction: body.contradiction ?? null,
      voiceNotes: body.voiceNotes ?? null,
      traits: body.traits ?? null,
      backstory: body.backstory ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run()

  return db.select().from(characters).where(eq(characters.id, id)).get()
})
