import { db } from "../../../database"
import { books, chapters, characters } from "../../../database/schema"
import { eq, sum, count } from "drizzle-orm"

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")

  const book = db.select().from(books).where(eq(books.id, id!)).get()
  if (!book) {
    throw createError({ statusCode: 404, message: "Book not found" })
  }

  const chapterStats = db
    .select({
      totalChapters: count(chapters.id),
      totalWords: sum(chapters.wordCount),
    })
    .from(chapters)
    .where(eq(chapters.bookId, id!))
    .get()

  const characterCount = db
    .select({ total: count(characters.id) })
    .from(characters)
    .where(eq(characters.bookId, id!))
    .get()

  const totalWords = Number(chapterStats?.totalWords ?? 0)
  const targetWordCount = book.targetWordCount ?? 80000
  const completionPercentage =
    targetWordCount > 0
      ? Math.min(100, Math.round((totalWords / targetWordCount) * 100))
      : 0

  return {
    totalChapters: chapterStats?.totalChapters ?? 0,
    totalWords,
    totalCharacters: characterCount?.total ?? 0,
    completionPercentage,
  }
})
