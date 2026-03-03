import { describe, it, expect, vi, beforeEach } from "vitest"
import { createTestDb } from "../../setup/test-db"
import { nanoid } from "nanoid"

import { books, chapters } from "../../../server/database/schema"
import { eq, asc } from "drizzle-orm"
import { exportSchema, parseBody } from "../../../server/utils/validation"

const { db, sqlite } = createTestDb()

vi.mock("../../../server/database", () => ({ db }))

let bookId: string

beforeEach(() => {
  sqlite.exec("DELETE FROM chapters")
  sqlite.exec("DELETE FROM books")
  bookId = nanoid()
  db.insert(books).values({ id: bookId, title: "My Novel", genre: "Literary Fiction", premise: "A story" }).run()
})

describe("DOCX Export", () => {
  it("validates export with valid bookId", () => {
    const result = exportSchema.safeParse({ bookId })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.bookId).toBe(bookId)
    }
  })

  it("finds book and chapters for export", () => {
    const content = JSON.stringify({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "It was a dark and stormy night." }] },
      ],
    })
    db.insert(chapters).values({ id: nanoid(), bookId, number: 1, title: "The Beginning", sortOrder: 0, content }).run()
    db.insert(chapters).values({ id: nanoid(), bookId, number: 2, title: "The Middle", sortOrder: 1 }).run()

    const book = db.select().from(books).where(eq(books.id, bookId)).get()
    expect(book).toBeDefined()
    expect(book!.title).toBe("My Novel")

    const allChapters = db
      .select()
      .from(chapters)
      .where(eq(chapters.bookId, bookId))
      .orderBy(asc(chapters.sortOrder))
      .all()

    expect(allChapters).toHaveLength(2)
    expect(allChapters[0].title).toBe("The Beginning")
    expect(allChapters[1].title).toBe("The Middle")
  })

  it("returns undefined for non-existent book", () => {
    const book = db.select().from(books).where(eq(books.id, "non-existent")).get()
    expect(book).toBeUndefined()
  })

  it("rejects missing bookId", () => {
    const result = exportSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it("rejects empty bookId", () => {
    const result = exportSchema.safeParse({ bookId: "" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("bookId is required")
    }
  })

  it("parseBody throws on empty bookId", () => {
    expect(() => parseBody(exportSchema, { bookId: "" })).toThrow()
  })

  it("generates correct filename from book title", () => {
    const book = db.select().from(books).where(eq(books.id, bookId)).get()!
    const filename = `${book.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.docx`
    expect(filename).toBe("my-novel.docx")
  })

  it("handles book with no chapters", () => {
    const allChapters = db.select().from(chapters).where(eq(chapters.bookId, bookId)).all()
    expect(allChapters).toHaveLength(0)
  })

  it("handles chapters with no content", () => {
    db.insert(chapters).values({ id: nanoid(), bookId, number: 1, title: "Empty", sortOrder: 0 }).run()
    const chapter = db.select().from(chapters).where(eq(chapters.bookId, bookId)).get()
    expect(chapter!.content).toBeNull()
  })
})
