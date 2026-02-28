import { db } from "../../database"
import { scenes } from "../../database/schema"
import { eq, max } from "drizzle-orm"
import { nanoid } from "nanoid"
import { createSceneSchema, parseBody } from "../../utils/validation"

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = parseBody(createSceneSchema, body)

  const id = nanoid()
  const now = new Date().toISOString()

  const maxOrder = db
    .select({ max: max(scenes.sortOrder) })
    .from(scenes)
    .where(eq(scenes.chapterId, data.chapterId))
    .get()

  const sortOrder = data.sortOrder ?? (maxOrder?.max ?? -1) + 1

  db.insert(scenes)
    .values({
      id,
      chapterId: data.chapterId,
      title: data.title,
      synopsis: data.synopsis ?? null,
      povCharacterId: data.povCharacterId ?? null,
      locationId: data.locationId ?? null,
      moodStart: data.moodStart ?? null,
      moodEnd: data.moodEnd ?? null,
      targetWordCount: data.targetWordCount ?? null,
      status: "planned",
      sortOrder,
      createdAt: now,
    })
    .run()

  return db.select().from(scenes).where(eq(scenes.id, id)).get()
})
