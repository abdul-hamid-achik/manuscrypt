import { db } from "../../database"
import { chapters } from "../../database/schema"
import { eq } from "drizzle-orm"

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")
  const body = await readBody(event)

  const existing = db.select().from(chapters).where(eq(chapters.id, id!)).get()
  if (!existing) {
    throw createError({ statusCode: 404, message: "Chapter not found" })
  }

  const { title, synopsis, content, wordCount, status, act, sortOrder } = body
  db.update(chapters)
    .set({
      ...(title !== undefined && { title }),
      ...(synopsis !== undefined && { synopsis }),
      ...(content !== undefined && { content }),
      ...(wordCount !== undefined && { wordCount }),
      ...(status !== undefined && { status }),
      ...(act !== undefined && { act }),
      ...(sortOrder !== undefined && { sortOrder }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(chapters.id, id!))
    .run()

  return db.select().from(chapters).where(eq(chapters.id, id!)).get()
})
