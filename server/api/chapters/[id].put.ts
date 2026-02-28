import { db } from "../../database"
import { chapters } from "../../database/schema"
import { eq } from "drizzle-orm"
import { updateChapterSchema, parseBody } from "../../utils/validation"

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")
  const body = await readBody(event)
  const data = parseBody(updateChapterSchema, body)

  const existing = db.select().from(chapters).where(eq(chapters.id, id!)).get()
  if (!existing) {
    throw createError({ statusCode: 404, message: "Chapter not found" })
  }

  db.update(chapters)
    .set({
      ...(data.title !== undefined && { title: data.title }),
      ...(data.synopsis !== undefined && { synopsis: data.synopsis }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.wordCount !== undefined && { wordCount: data.wordCount }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.act !== undefined && { act: data.act }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(chapters.id, id!))
    .run()

  return db.select().from(chapters).where(eq(chapters.id, id!)).get()
})
