import { db } from "../../database"
import { books, chapters, characters, locations } from "../../database/schema"
import { eq, asc } from "drizzle-orm"
import { tiptapJsonToText } from "../../utils/tiptap"

export default defineEventHandler(async (event) => {
  const bookId = getRouterParam(event, "bookId")

  const book = db.select().from(books).where(eq(books.id, bookId!)).get()
  if (!book) {
    throw createError({ statusCode: 404, message: "Book not found" })
  }

  const chapterRows = db
    .select()
    .from(chapters)
    .where(eq(chapters.bookId, bookId!))
    .orderBy(asc(chapters.sortOrder))
    .all()

  const characterRows = db
    .select()
    .from(characters)
    .where(eq(characters.bookId, bookId!))
    .all()

  const locationRows = db
    .select()
    .from(locations)
    .where(eq(locations.bookId, bookId!))
    .all()

  const lines: string[] = []

  lines.push(`# ${book.title}`)
  lines.push("")
  if (book.genre) lines.push(`**Genre:** ${book.genre}`)
  if (book.premise) {
    lines.push("")
    lines.push(`## Premise`)
    lines.push("")
    lines.push(book.premise)
  }
  lines.push("")

  if (characterRows.length > 0) {
    lines.push(`## Characters`)
    lines.push("")
    for (const char of characterRows) {
      lines.push(`### ${char.name}`)
      if (char.role) lines.push(`**Role:** ${char.role}`)
      if (char.archetype) lines.push(`**Archetype:** ${char.archetype}`)
      if (char.description) lines.push(`\n${char.description}`)
      lines.push("")
    }
  }

  if (locationRows.length > 0) {
    lines.push(`## Locations`)
    lines.push("")
    for (const loc of locationRows) {
      lines.push(`### ${loc.name}`)
      if (loc.description) lines.push(loc.description)
      lines.push("")
    }
  }

  lines.push(`---`)
  lines.push("")

  for (const chapter of chapterRows) {
    lines.push(`## Chapter ${chapter.number}: ${chapter.title}`)
    lines.push("")
    if (chapter.synopsis) {
      lines.push(`*${chapter.synopsis}*`)
      lines.push("")
    }
    if (chapter.content) {
      const text = tiptapJsonToText(chapter.content)
      if (text.trim()) {
        lines.push(text.trim())
        lines.push("")
      }
    }
  }

  const markdown = lines.join("\n")

  setResponseHeader(event, "Content-Type", "text/markdown; charset=utf-8")
  setResponseHeader(
    event,
    "Content-Disposition",
    `attachment; filename="${book.title.replace(/[^a-zA-Z0-9 ]/g, "")}.md"`
  )

  return markdown
})
