import { db } from "../../database"
import { writingSessions } from "../../database/schema"
import { eq, desc } from "drizzle-orm"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const bookId = query.bookId as string | undefined

  if (!bookId) {
    throw createError({ statusCode: 400, message: "bookId query param is required" })
  }

  const limit = parseInt(query.limit as string) || 20

  return db
    .select()
    .from(writingSessions)
    .where(eq(writingSessions.bookId, bookId))
    .orderBy(desc(writingSessions.startedAt))
    .limit(limit)
    .all()
})
