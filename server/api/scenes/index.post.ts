import { db } from "../../database"
import { scenes } from "../../database/schema"
import { eq, max } from "drizzle-orm"
import { nanoid } from "nanoid"

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.chapterId) {
    throw createError({ statusCode: 400, message: "chapterId is required" })
  }
  if (!body.title) {
    throw createError({ statusCode: 400, message: "title is required" })
  }

  const id = nanoid()
  const now = new Date().toISOString()

  const maxOrder = db
    .select({ max: max(scenes.sortOrder) })
    .from(scenes)
    .where(eq(scenes.chapterId, body.chapterId))
    .get()

  const sortOrder = body.sortOrder ?? (maxOrder?.max ?? -1) + 1

  db.insert(scenes)
    .values({
      id,
      chapterId: body.chapterId,
      title: body.title,
      synopsis: body.synopsis ?? null,
      povCharacterId: body.povCharacterId ?? null,
      locationId: body.locationId ?? null,
      moodStart: body.moodStart ?? null,
      moodEnd: body.moodEnd ?? null,
      targetWordCount: body.targetWordCount ?? null,
      status: "planned",
      sortOrder,
      createdAt: now,
    })
    .run()

  return db.select().from(scenes).where(eq(scenes.id, id)).get()
})
