import { db } from "../../database"
import { characters } from "../../database/schema"
import { eq } from "drizzle-orm"

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")
  const body = await readBody(event)

  const existing = db.select().from(characters).where(eq(characters.id, id!)).get()
  if (!existing) {
    throw createError({ statusCode: 404, message: "Character not found" })
  }

  const { name, role, age, archetype, description, motivation, fear, contradiction, voiceNotes, traits, backstory } = body
  db.update(characters)
    .set({
      ...(name !== undefined && { name }),
      ...(role !== undefined && { role }),
      ...(age !== undefined && { age }),
      ...(archetype !== undefined && { archetype }),
      ...(description !== undefined && { description }),
      ...(motivation !== undefined && { motivation }),
      ...(fear !== undefined && { fear }),
      ...(contradiction !== undefined && { contradiction }),
      ...(voiceNotes !== undefined && { voiceNotes }),
      ...(traits !== undefined && { traits }),
      ...(backstory !== undefined && { backstory }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(characters.id, id!))
    .run()

  return db.select().from(characters).where(eq(characters.id, id!)).get()
})
