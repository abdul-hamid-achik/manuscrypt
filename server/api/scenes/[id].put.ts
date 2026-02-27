import { db } from "../../database"
import { scenes } from "../../database/schema"
import { eq } from "drizzle-orm"

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")
  const body = await readBody(event)

  const existing = db.select().from(scenes).where(eq(scenes.id, id!)).get()
  if (!existing) {
    throw createError({ statusCode: 404, message: "Scene not found" })
  }

  const { title, synopsis, povCharacterId, locationId, moodStart, moodEnd, targetWordCount, status, sortOrder } = body
  db.update(scenes)
    .set({
      ...(title !== undefined && { title }),
      ...(synopsis !== undefined && { synopsis }),
      ...(povCharacterId !== undefined && { povCharacterId }),
      ...(locationId !== undefined && { locationId }),
      ...(moodStart !== undefined && { moodStart }),
      ...(moodEnd !== undefined && { moodEnd }),
      ...(targetWordCount !== undefined && { targetWordCount }),
      ...(status !== undefined && { status }),
      ...(sortOrder !== undefined && { sortOrder }),
    })
    .where(eq(scenes.id, id!))
    .run()

  return db.select().from(scenes).where(eq(scenes.id, id!)).get()
})
