import { db } from "../../database"
import { locations } from "../../database/schema"
import { eq } from "drizzle-orm"
import { updateLocationSchema, parseBody } from "../../utils/validation"

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")
  const body = await readBody(event)
  const data = parseBody(updateLocationSchema, body)

  const existing = db.select().from(locations).where(eq(locations.id, id!)).get()
  if (!existing) {
    throw createError({ statusCode: 404, message: "Location not found" })
  }

  db.update(locations)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.sensoryDetails !== undefined && { sensoryDetails: data.sensoryDetails }),
      ...(data.emotionalTone !== undefined && { emotionalTone: data.emotionalTone }),
    })
    .where(eq(locations.id, id!))
    .run()

  return db.select().from(locations).where(eq(locations.id, id!)).get()
})
