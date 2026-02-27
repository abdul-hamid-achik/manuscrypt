import { db } from "../../../database"
import { aiMessages } from "../../../database/schema"
import { eq, and, isNull, asc } from "drizzle-orm"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const bookId = query.bookId as string | undefined
  const characterId = query.characterId as string | undefined

  if (!bookId) {
    throw createError({ statusCode: 400, message: "bookId query param is required" })
  }

  const conditions = [eq(aiMessages.bookId, bookId)]

  if (characterId) {
    conditions.push(eq(aiMessages.characterId, characterId))
  } else {
    conditions.push(isNull(aiMessages.characterId))
  }

  return db
    .select()
    .from(aiMessages)
    .where(and(...conditions))
    .orderBy(asc(aiMessages.createdAt))
    .all()
})
