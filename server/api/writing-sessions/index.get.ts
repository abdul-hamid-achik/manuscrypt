import { db } from "../../database"
import { writingSessions } from "../../database/schema"
import { eq, desc } from "drizzle-orm"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const bookId = query.bookId as string | undefined

  if (!bookId) {
    throw createError({ statusCode: 400, message: "bookId query param is required" })
  }

  const includeAll = query.includeAll === "1" || query.includeAll === "true"
  const limitParam = query.limit as string | undefined
  const limitValue = Number.parseInt(limitParam ?? "", 10)

  const baseQuery = db
    .select()
    .from(writingSessions)
    .where(eq(writingSessions.bookId, bookId))
    .orderBy(desc(writingSessions.startedAt))

  if (includeAll || limitValue === 0) {
    return baseQuery.all()
  }

  const limit = Number.isFinite(limitValue) && limitValue > 0
    ? Math.min(limitValue, 100)
    : 20

  return baseQuery.limit(limit).all()
})
