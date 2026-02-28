import { db } from "../../database"
import { characters } from "../../database/schema"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { createCharacterSchema, parseBody } from "../../utils/validation"

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = parseBody(createCharacterSchema, body)

  const id = nanoid()
  const now = new Date().toISOString()

  db.insert(characters)
    .values({
      id,
      bookId: data.bookId,
      name: data.name,
      role: data.role ?? null,
      age: data.age ?? null,
      archetype: data.archetype ?? null,
      description: data.description ?? null,
      motivation: data.motivation ?? null,
      fear: data.fear ?? null,
      contradiction: data.contradiction ?? null,
      voiceNotes: data.voiceNotes ?? null,
      traits: data.traits ?? null,
      backstory: data.backstory ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run()

  return db.select().from(characters).where(eq(characters.id, id)).get()
})
