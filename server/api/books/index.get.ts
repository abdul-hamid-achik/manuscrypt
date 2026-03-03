import { db } from "../../database"
import { books, chapters } from "../../database/schema"
import { eq, count, sql } from "drizzle-orm"

export default defineEventHandler(async () => {
  const result = await db
    .select({
      id: books.id,
      title: books.title,
      genre: books.genre,
      premise: books.premise,
      targetWordCount: books.targetWordCount,
      status: books.status,
      styleGuide: books.styleGuide,
      createdAt: books.createdAt,
      updatedAt: books.updatedAt,
      chapterCount: count(chapters.id),
      wordCount: sql<number>`coalesce(sum(${chapters.wordCount}), 0)`,
    })
    .from(books)
    .leftJoin(chapters, eq(books.id, chapters.bookId))
    .groupBy(books.id)
    .all()

  return result
})
