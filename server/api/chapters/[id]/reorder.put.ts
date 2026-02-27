import { db } from "../../../database"
import { chapters } from "../../../database/schema"
import { eq } from "drizzle-orm"

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")
  const body = await readBody(event)

  if (typeof body.newOrder !== "number") {
    throw createError({ statusCode: 400, message: "newOrder (number) is required" })
  }

  const existing = db.select().from(chapters).where(eq(chapters.id, id!)).get()
  if (!existing) {
    throw createError({ statusCode: 404, message: "Chapter not found" })
  }

  db.update(chapters)
    .set({
      sortOrder: body.newOrder,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(chapters.id, id!))
    .run()

  return db.select().from(chapters).where(eq(chapters.id, id!)).get()
})
