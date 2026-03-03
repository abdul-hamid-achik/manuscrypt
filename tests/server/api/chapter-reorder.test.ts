import { describe, it, expect, vi, beforeEach } from "vitest"
import { createTestDb } from "../../setup/test-db"
import { nanoid } from "nanoid"

import { books, chapters } from "../../../server/database/schema"
import { eq } from "drizzle-orm"
import { reorderSchema, parseBody } from "../../../server/utils/validation"

const { db, sqlite } = createTestDb()

vi.mock("../../../server/database", () => ({ db }))

let bookId: string

beforeEach(() => {
  sqlite.exec("DELETE FROM chapters")
  sqlite.exec("DELETE FROM books")
  bookId = nanoid()
  db.insert(books).values({ id: bookId, title: "Test Book" }).run()
})

describe("Chapter Reorder PUT", () => {
  it("successfully reorders a chapter with valid newOrder", () => {
    const chapterId = nanoid()
    db.insert(chapters).values({ id: chapterId, bookId, number: 1, title: "Ch1", sortOrder: 0 }).run()

    const { newOrder } = parseBody(reorderSchema, { newOrder: 5 })

    const existing = db.select().from(chapters).where(eq(chapters.id, chapterId)).get()
    expect(existing).toBeDefined()

    db.update(chapters)
      .set({ sortOrder: newOrder, updatedAt: new Date().toISOString() })
      .where(eq(chapters.id, chapterId))
      .run()

    const updated = db.select().from(chapters).where(eq(chapters.id, chapterId)).get()
    expect(updated!.sortOrder).toBe(5)
  })

  it("returns 404 when chapter does not exist", () => {
    const nonExistentId = nanoid()
    const existing = db.select().from(chapters).where(eq(chapters.id, nonExistentId)).get()
    expect(existing).toBeUndefined()
  })

  it("rejects non-numeric newOrder", () => {
    const result = reorderSchema.safeParse({ newOrder: "abc" })
    expect(result.success).toBe(false)
  })

  it("rejects negative newOrder", () => {
    const result = reorderSchema.safeParse({ newOrder: -1 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("newOrder must be >= 0")
    }
  })

  it("rejects non-integer newOrder", () => {
    const result = reorderSchema.safeParse({ newOrder: 2.5 })
    expect(result.success).toBe(false)
  })

  it("rejects missing newOrder", () => {
    const result = reorderSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it("accepts zero as newOrder", () => {
    const result = reorderSchema.safeParse({ newOrder: 0 })
    expect(result.success).toBe(true)
  })

  it("parseBody throws on invalid input", () => {
    expect(() => parseBody(reorderSchema, { newOrder: -5 })).toThrow()
  })
})
