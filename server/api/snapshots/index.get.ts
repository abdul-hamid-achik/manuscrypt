import { db } from "../../database"
import { contentSnapshots } from "../../database/schema"
import { eq, desc } from "drizzle-orm"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const chapterId = query.chapterId as string | undefined

  if (!chapterId) {
    throw createError({ statusCode: 400, message: "chapterId query param is required" })
  }

  return db
    .select()
    .from(contentSnapshots)
    .where(eq(contentSnapshots.chapterId, chapterId))
    .orderBy(desc(contentSnapshots.createdAt))
    .limit(50)
    .all()
})
