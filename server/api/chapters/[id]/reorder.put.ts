import { db } from "../../../database"
import { chapters } from "../../../database/schema"
import { eq } from "drizzle-orm"
import { parseBody, reorderSchema } from "../../../utils/validation"

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")
  const body = await readBody(event)
  const { newOrder } = parseBody(reorderSchema, body)

  const existing = db.select().from(chapters).where(eq(chapters.id, id!)).get()
  if (!existing) {
    throw createError({ statusCode: 404, message: "Chapter not found" })
  }

  db.update(chapters)
    .set({
      sortOrder: newOrder,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(chapters.id, id!))
    .run()

  return db.select().from(chapters).where(eq(chapters.id, id!)).get()
})
