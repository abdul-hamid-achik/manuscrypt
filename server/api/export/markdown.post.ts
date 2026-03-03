import { db } from "../../database"
import { books, chapters } from "../../database/schema"
import { eq, asc } from "drizzle-orm"
import { tiptapJsonToText } from "../../utils/tiptap"
import { parseBody, exportSchema } from "../../utils/validation"

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { bookId } = parseBody(exportSchema, body)

  const book = db.select().from(books).where(eq(books.id, bookId)).get()
  if (!book) {
    throw createError({ statusCode: 404, message: "Book not found" })
  }

  const allChapters = db
    .select()
    .from(chapters)
    .where(eq(chapters.bookId, bookId))
    .orderBy(asc(chapters.sortOrder))
    .all()

  let markdown = `# ${book.title}\n\n`

  if (book.premise) {
    markdown += `*${book.premise}*\n\n---\n\n`
  }

  for (const chapter of allChapters) {
    const chapterTitle = chapter.title || `Chapter ${chapter.number}`
    markdown += `## Chapter ${chapter.number}: ${chapterTitle}\n\n`

    const text = tiptapJsonToText(chapter.content)
    if (text.trim()) {
      markdown += text.trim() + "\n\n"
    }
  }

  const filename = `${book.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`

  return { markdown, filename }
})
