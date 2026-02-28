import { db } from "../../database"
import { characters } from "../../database/schema"
import { eq } from "drizzle-orm"
import { updateCharacterSchema, parseBody } from "../../utils/validation"

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")
  const body = await readBody(event)
  const data = parseBody(updateCharacterSchema, body)

  const existing = db.select().from(characters).where(eq(characters.id, id!)).get()
  if (!existing) {
    throw createError({ statusCode: 404, message: "Character not found" })
  }

  db.update(characters)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.role !== undefined && { role: data.role }),
      ...(data.age !== undefined && { age: data.age }),
      ...(data.archetype !== undefined && { archetype: data.archetype }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.motivation !== undefined && { motivation: data.motivation }),
      ...(data.fear !== undefined && { fear: data.fear }),
      ...(data.contradiction !== undefined && { contradiction: data.contradiction }),
      ...(data.voiceNotes !== undefined && { voiceNotes: data.voiceNotes }),
      ...(data.traits !== undefined && { traits: data.traits }),
      ...(data.backstory !== undefined && { backstory: data.backstory }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(characters.id, id!))
    .run()

  return db.select().from(characters).where(eq(characters.id, id!)).get()
})
