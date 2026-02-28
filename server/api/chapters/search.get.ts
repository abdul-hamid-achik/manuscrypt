import { db } from "../../database"
import { chapters } from "../../database/schema"
import { eq, and } from "drizzle-orm"
import { tiptapJsonToText } from "../../utils/tiptap"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const bookId = query.bookId as string | undefined
  const q = query.q as string | undefined

  if (!bookId) {
    throw createError({ statusCode: 400, message: "bookId query param is required" })
  }
  if (!q || !q.trim()) {
    throw createError({ statusCode: 400, message: "q query param is required" })
  }

  const term = q.trim().toLowerCase()

  // Fetch all chapters for this book and search in-memory on plain text
  // This avoids searching raw TipTap JSON with SQL LIKE
  const allChapters = db
    .select({
      id: chapters.id,
      title: chapters.title,
      number: chapters.number,
      content: chapters.content,
    })
    .from(chapters)
    .where(eq(chapters.bookId, bookId))
    .all()

  const results = allChapters
    .filter((ch) => {
      const titleMatch = ch.title.toLowerCase().includes(term)
      const plainText = tiptapJsonToText(ch.content)
      const contentMatch = plainText.toLowerCase().includes(term)
      return titleMatch || contentMatch
    })
    .slice(0, 20)
    .map(({ content, ...chapter }) => {
      let snippet = ""
      const plainText = tiptapJsonToText(content)
      const lower = plainText.toLowerCase()
      const idx = lower.indexOf(term)
      if (idx !== -1) {
        const start = Math.max(0, idx - 60)
        const end = Math.min(plainText.length, idx + term.length + 60)
        snippet =
          (start > 0 ? "..." : "") +
          plainText.slice(start, end).replace(/\s+/g, " ").trim() +
          (end < plainText.length ? "..." : "")
      }
      return { ...chapter, snippet }
    })

  return results
})
