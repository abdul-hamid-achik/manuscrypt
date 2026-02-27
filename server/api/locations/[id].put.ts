import { db } from "../../database"
import { locations } from "../../database/schema"
import { eq } from "drizzle-orm"

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")
  const body = await readBody(event)

  const existing = db.select().from(locations).where(eq(locations.id, id!)).get()
  if (!existing) {
    throw createError({ statusCode: 404, message: "Location not found" })
  }

  const { name, description, sensoryDetails, emotionalTone } = body
  db.update(locations)
    .set({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(sensoryDetails !== undefined && { sensoryDetails }),
      ...(emotionalTone !== undefined && { emotionalTone }),
    })
    .where(eq(locations.id, id!))
    .run()

  return db.select().from(locations).where(eq(locations.id, id!)).get()
})
