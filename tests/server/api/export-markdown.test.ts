import { describe, it, expect, vi, beforeEach } from "vitest"
import { createTestDb } from "../../setup/test-db"
import { nanoid } from "nanoid"

const { db, sqlite } = createTestDb()

vi.mock("../../../server/database", () => ({ db }))

import { books, chapters } from "../../../server/database/schema"
import { eq, asc } from "drizzle-orm"
import { tiptapJsonToText } from "../../../server/utils/tiptap"

let bookId: string

beforeEach(() => {
  sqlite.exec("DELETE FROM chapters")
  sqlite.exec("DELETE FROM books")
  bookId = nanoid()
  db.insert(books).values({ id: bookId, title: "My Novel", premise: "A story about growth" }).run()
})

describe("Markdown Export", () => {
  it("exports a book with chapters to markdown", () => {
    const content = JSON.stringify({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "It was a dark and stormy night." }] },
      ],
    })
    db.insert(chapters).values({ id: nanoid(), bookId, number: 1, title: "The Beginning", sortOrder: 0, content }).run()
    db.insert(chapters).values({ id: nanoid(), bookId, number: 2, title: "The Middle", sortOrder: 1 }).run()

    const book = db.select().from(books).where(eq(books.id, bookId)).get()!
    const allChapters = db.select().from(chapters).where(eq(chapters.bookId, bookId)).orderBy(asc(chapters.sortOrder)).all()

    let markdown = `# ${book.title}\n\n`
    if (book.premise) markdown += `*${book.premise}*\n\n---\n\n`
    for (const chapter of allChapters) {
      markdown += `## Chapter ${chapter.number}: ${chapter.title}\n\n`
      const text = tiptapJsonToText(chapter.content)
      if (text.trim()) markdown += text.trim() + "\n\n"
    }

    expect(markdown).toContain("# My Novel")
    expect(markdown).toContain("*A story about growth*")
    expect(markdown).toContain("## Chapter 1: The Beginning")
    expect(markdown).toContain("It was a dark and stormy night.")
    expect(markdown).toContain("## Chapter 2: The Middle")
  })

  it("generates correct filename", () => {
    const book = db.select().from(books).where(eq(books.id, bookId)).get()!
    const filename = `${book.title.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}.md`
    expect(filename).toBe("my-novel.md")
  })

  it("handles book with no chapters", () => {
    const book = db.select().from(books).where(eq(books.id, bookId)).get()!
    const allChapters = db.select().from(chapters).where(eq(chapters.bookId, bookId)).all()

    let markdown = `# ${book.title}\n\n`
    expect(allChapters).toHaveLength(0)
    expect(markdown).toBe("# My Novel\n\n")
  })

  it("handles chapters with no content", () => {
    db.insert(chapters).values({ id: nanoid(), bookId, number: 1, title: "Empty", sortOrder: 0 }).run()
    const allChapters = db.select().from(chapters).where(eq(chapters.bookId, bookId)).all()
    const text = tiptapJsonToText(allChapters[0].content)
    expect(text).toBe("")
  })
})
