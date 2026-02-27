import { db } from "../../database"
import { locations } from "../../database/schema"
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

  db.insert(locations)
    .values({
      id,
      bookId: body.bookId,
      name: body.name,
      description: body.description ?? null,
      sensoryDetails: body.sensoryDetails ?? null,
      emotionalTone: body.emotionalTone ?? null,
      createdAt: now,
    })
    .run()

  return db.select().from(locations).where(eq(locations.id, id)).get()
})
