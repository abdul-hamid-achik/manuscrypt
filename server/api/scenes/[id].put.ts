import { db } from "../../database"
import { scenes } from "../../database/schema"
import { eq } from "drizzle-orm"
import { updateSceneSchema, parseBody } from "../../utils/validation"

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")
  const body = await readBody(event)
  const data = parseBody(updateSceneSchema, body)

  const existing = db.select().from(scenes).where(eq(scenes.id, id!)).get()
  if (!existing) {
    throw createError({ statusCode: 404, message: "Scene not found" })
  }

  db.update(scenes)
    .set({
      ...(data.title !== undefined && { title: data.title }),
      ...(data.synopsis !== undefined && { synopsis: data.synopsis }),
      ...(data.povCharacterId !== undefined && { povCharacterId: data.povCharacterId }),
      ...(data.locationId !== undefined && { locationId: data.locationId }),
      ...(data.moodStart !== undefined && { moodStart: data.moodStart }),
      ...(data.moodEnd !== undefined && { moodEnd: data.moodEnd }),
      ...(data.targetWordCount !== undefined && { targetWordCount: data.targetWordCount }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    })
    .where(eq(scenes.id, id!))
    .run()

  return db.select().from(scenes).where(eq(scenes.id, id!)).get()
})
