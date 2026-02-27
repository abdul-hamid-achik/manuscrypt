import { describe, it, expect, vi, beforeEach } from "vitest"
import { createTestDb } from "../../setup/test-db"
import { nanoid } from "nanoid"

const { db, sqlite } = createTestDb()

vi.mock("../../../server/database", () => ({ db }))

import { books, chapters, characters } from "../../../server/database/schema"
import { eq } from "drizzle-orm"

beforeEach(() => {
  sqlite.exec("DELETE FROM characters")
  sqlite.exec("DELETE FROM chapters")
  sqlite.exec("DELETE FROM books")
})

describe("Books CRUD", () => {
  it("lists all books", () => {
    db.insert(books).values({ id: nanoid(), title: "Book A" }).run()
    db.insert(books).values({ id: nanoid(), title: "Book B" }).run()
    const all = db.select().from(books).all()
    expect(all).toHaveLength(2)
  })

  it("creates a book with defaults", () => {
    const id = nanoid()
    db.insert(books).values({ id, title: "New Book" }).run()
    const book = db.select().from(books).where(eq(books.id, id)).get()!
    expect(book.title).toBe("New Book")
    expect(book.status).toBe("planning")
    expect(book.targetWordCount).toBe(80000)
  })

  it("creates a book with all fields", () => {
    const id = nanoid()
    db.insert(books).values({
      id,
      title: "Full Book",
      genre: "Sci-Fi",
      premise: "Space adventure",
      targetWordCount: 100000,
      styleGuide: "Use vivid imagery",
    }).run()
    const book = db.select().from(books).where(eq(books.id, id)).get()!
    expect(book.genre).toBe("Sci-Fi")
    expect(book.premise).toBe("Space adventure")
    expect(book.targetWordCount).toBe(100000)
    expect(book.styleGuide).toBe("Use vivid imagery")
  })

  it("updates a book partially", () => {
    const id = nanoid()
    db.insert(books).values({ id, title: "Original" }).run()
    db.update(books).set({ title: "Updated", genre: "Romance" }).where(eq(books.id, id)).run()
    const book = db.select().from(books).where(eq(books.id, id)).get()!
    expect(book.title).toBe("Updated")
    expect(book.genre).toBe("Romance")
  })

  it("deletes a book", () => {
    const id = nanoid()
    db.insert(books).values({ id, title: "To Delete" }).run()
    db.delete(books).where(eq(books.id, id)).run()
    expect(db.select().from(books).where(eq(books.id, id)).get()).toBeUndefined()
  })

  it("cascades delete to chapters and characters", () => {
    const bookId = nanoid()
    db.insert(books).values({ id: bookId, title: "Book" }).run()
    db.insert(chapters).values({ id: nanoid(), bookId, number: 1, title: "Ch", sortOrder: 0 }).run()
    db.insert(characters).values({ id: nanoid(), bookId, name: "Char" }).run()

    db.delete(books).where(eq(books.id, bookId)).run()
    expect(db.select().from(chapters).where(eq(chapters.bookId, bookId)).all()).toHaveLength(0)
    expect(db.select().from(characters).where(eq(characters.bookId, bookId)).all()).toHaveLength(0)
  })
})

describe("Book stats", () => {
  it("computes stats for a book", () => {
    const bookId = nanoid()
    db.insert(books).values({ id: bookId, title: "Book", targetWordCount: 100000 }).run()
    db.insert(chapters).values({ id: nanoid(), bookId, number: 1, title: "Ch1", sortOrder: 0, wordCount: 5000 }).run()
    db.insert(chapters).values({ id: nanoid(), bookId, number: 2, title: "Ch2", sortOrder: 1, wordCount: 3000 }).run()
    db.insert(characters).values({ id: nanoid(), bookId, name: "Alice" }).run()

    const allChapters = db.select().from(chapters).where(eq(chapters.bookId, bookId)).all()
    const allCharacters = db.select().from(characters).where(eq(characters.bookId, bookId)).all()
    const book = db.select().from(books).where(eq(books.id, bookId)).get()!

    const totalWords = allChapters.reduce((sum, c) => sum + (c.wordCount ?? 0), 0)
    const completionPercentage = book.targetWordCount ? Math.round((totalWords / book.targetWordCount) * 100) : 0

    expect(totalWords).toBe(8000)
    expect(allChapters).toHaveLength(2)
    expect(allCharacters).toHaveLength(1)
    expect(completionPercentage).toBe(8)
  })
})
