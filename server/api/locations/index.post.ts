import { db } from "../../database"
import { locations } from "../../database/schema"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { createLocationSchema, parseBody } from "../../utils/validation"

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = parseBody(createLocationSchema, body)

  const id = nanoid()
  const now = new Date().toISOString()

  db.insert(locations)
    .values({
      id,
      bookId: data.bookId,
      name: data.name,
      description: data.description ?? null,
      sensoryDetails: data.sensoryDetails ?? null,
      emotionalTone: data.emotionalTone ?? null,
      createdAt: now,
    })
    .run()

  return db.select().from(locations).where(eq(locations.id, id)).get()
})
