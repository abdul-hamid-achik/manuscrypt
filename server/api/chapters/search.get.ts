import { db } from "../../database"
import { chapters } from "../../database/schema"
import { eq, like, or, and } from "drizzle-orm"

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

  const searchTerm = `%${q.trim()}%`

  const results = db
    .select({
      id: chapters.id,
      title: chapters.title,
      number: chapters.number,
      content: chapters.content,
    })
    .from(chapters)
    .where(
      and(
        eq(chapters.bookId, bookId),
        or(
          like(chapters.title, searchTerm),
          like(chapters.content, searchTerm),
        ),
      ),
    )
    .limit(20)
    .all()

  const term = q.trim().toLowerCase()
  return results.map(({ content, ...chapter }) => {
    let snippet = ""
    if (content) {
      const lower = content.toLowerCase()
      const idx = lower.indexOf(term)
      if (idx !== -1) {
        const start = Math.max(0, idx - 50)
        const end = Math.min(content.length, idx + term.length + 50)
        snippet =
          (start > 0 ? "..." : "") +
          content.slice(start, end) +
          (end < content.length ? "..." : "")
        snippet = snippet
          .replace(/[{}"[\]]/g, "")
          .replace(/\\n/g, " ")
          .replace(/\s+/g, " ")
          .trim()
      }
    }
    return { ...chapter, snippet }
  })
})
