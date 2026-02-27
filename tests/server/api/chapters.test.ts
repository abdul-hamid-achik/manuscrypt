import { describe, it, expect, vi, beforeEach } from "vitest"
import { createTestDb } from "../../setup/test-db"
import { nanoid } from "nanoid"

const { db, sqlite } = createTestDb()

vi.mock("../../../server/database", () => ({ db }))

import { books, chapters, scenes } from "../../../server/database/schema"
import { eq, asc, max } from "drizzle-orm"

let bookId: string

beforeEach(() => {
  sqlite.exec("DELETE FROM scenes")
  sqlite.exec("DELETE FROM chapters")
  sqlite.exec("DELETE FROM books")
  bookId = nanoid()
  db.insert(books).values({ id: bookId, title: "Test Book" }).run()
})

describe("Chapters CRUD", () => {
  it("lists chapters by bookId ordered by sortOrder", () => {
    db.insert(chapters).values({ id: nanoid(), bookId, number: 2, title: "Second", sortOrder: 2 }).run()
    db.insert(chapters).values({ id: nanoid(), bookId, number: 1, title: "First", sortOrder: 1 }).run()

    const result = db.select().from(chapters).where(eq(chapters.bookId, bookId)).orderBy(asc(chapters.sortOrder)).all()
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe("First")
    expect(result[1].title).toBe("Second")
  })

  it("creates a chapter with defaults", () => {
    const id = nanoid()
    db.insert(chapters).values({ id, bookId, number: 1, title: "Chapter One", sortOrder: 0 }).run()
    const chapter = db.select().from(chapters).where(eq(chapters.id, id)).get()!
    expect(chapter.title).toBe("Chapter One")
    expect(chapter.status).toBe("planned")
    expect(chapter.wordCount).toBe(0)
  })

  it("creates a chapter with content", () => {
    const id = nanoid()
    const content = JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }] })
    db.insert(chapters).values({ id, bookId, number: 1, title: "Ch1", sortOrder: 0, content, wordCount: 1 }).run()
    const chapter = db.select().from(chapters).where(eq(chapters.id, id)).get()!
    expect(chapter.content).toBe(content)
    expect(chapter.wordCount).toBe(1)
  })

  it("updates a chapter", () => {
    const id = nanoid()
    db.insert(chapters).values({ id, bookId, number: 1, title: "Original", sortOrder: 0 }).run()
    db.update(chapters).set({ title: "Updated", synopsis: "New synopsis", status: "writing" }).where(eq(chapters.id, id)).run()
    const chapter = db.select().from(chapters).where(eq(chapters.id, id)).get()!
    expect(chapter.title).toBe("Updated")
    expect(chapter.synopsis).toBe("New synopsis")
    expect(chapter.status).toBe("writing")
  })

  it("deletes a chapter", () => {
    const id = nanoid()
    db.insert(chapters).values({ id, bookId, number: 1, title: "To Delete", sortOrder: 0 }).run()
    db.delete(chapters).where(eq(chapters.id, id)).run()
    expect(db.select().from(chapters).where(eq(chapters.id, id)).get()).toBeUndefined()
  })

  it("cascades delete from chapter to scenes", () => {
    const chapterId = nanoid()
    db.insert(chapters).values({ id: chapterId, bookId, number: 1, title: "Ch", sortOrder: 0 }).run()
    db.insert(scenes).values({ id: nanoid(), chapterId, title: "Scene 1", sortOrder: 0 }).run()
    db.delete(chapters).where(eq(chapters.id, chapterId)).run()
    expect(db.select().from(scenes).where(eq(scenes.chapterId, chapterId)).all()).toHaveLength(0)
  })
})

describe("Chapter reorder", () => {
  it("updates sortOrder for a chapter", () => {
    const id1 = nanoid()
    const id2 = nanoid()
    db.insert(chapters).values({ id: id1, bookId, number: 1, title: "Ch1", sortOrder: 0 }).run()
    db.insert(chapters).values({ id: id2, bookId, number: 2, title: "Ch2", sortOrder: 1 }).run()

    db.update(chapters).set({ sortOrder: 5 }).where(eq(chapters.id, id1)).run()
    const updated = db.select().from(chapters).where(eq(chapters.id, id1)).get()!
    expect(updated.sortOrder).toBe(5)
  })
})
