import { describe, it, expect, vi, beforeEach } from "vitest"
import { createTestDb } from "../../setup/test-db"
import { nanoid } from "nanoid"

import { books, writingSessions } from "../../../server/database/schema"
import { eq, desc } from "drizzle-orm"
import { createWritingSessionSchema } from "../../../server/utils/validation"

const { db, sqlite } = createTestDb()

vi.mock("../../../server/database", () => ({ db }))

let bookId: string

beforeEach(() => {
  sqlite.exec("DELETE FROM writing_sessions")
  sqlite.exec("DELETE FROM books")
  bookId = nanoid()
  db.insert(books).values({ id: bookId, title: "Test Book" }).run()
})

describe("Writing Sessions POST", () => {
  it("creates a writing session with valid data", () => {
    const result = createWritingSessionSchema.safeParse({
      bookId,
      wordsWritten: 500,
      duration: 3600,
    })
    expect(result.success).toBe(true)

    const id = nanoid()
    db.insert(writingSessions)
      .values({
        id,
        bookId,
        wordsWritten: 500,
        duration: 3600,
        startedAt: new Date().toISOString(),
      })
      .run()

    const session = db.select().from(writingSessions).where(eq(writingSessions.id, id)).get()
    expect(session).toBeDefined()
    expect(session!.bookId).toBe(bookId)
    expect(session!.wordsWritten).toBe(500)
    expect(session!.duration).toBe(3600)
  })

  it("creates a session with only required fields", () => {
    const result = createWritingSessionSchema.safeParse({ bookId })
    expect(result.success).toBe(true)

    const id = nanoid()
    db.insert(writingSessions).values({ id, bookId }).run()

    const session = db.select().from(writingSessions).where(eq(writingSessions.id, id)).get()
    expect(session).toBeDefined()
    expect(session!.wordsWritten).toBe(0)
  })

  it("creates a session with chapterId", () => {
    const result = createWritingSessionSchema.safeParse({
      bookId,
      chapterId: "ch-1",
      wordsWritten: 100,
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing bookId", () => {
    const result = createWritingSessionSchema.safeParse({
      wordsWritten: 500,
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty bookId", () => {
    const result = createWritingSessionSchema.safeParse({
      bookId: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects negative wordsWritten", () => {
    const result = createWritingSessionSchema.safeParse({
      bookId,
      wordsWritten: -10,
    })
    expect(result.success).toBe(false)
  })

  it("rejects negative duration", () => {
    const result = createWritingSessionSchema.safeParse({
      bookId,
      duration: -1,
    })
    expect(result.success).toBe(false)
  })

  it("rejects non-integer wordsWritten", () => {
    const result = createWritingSessionSchema.safeParse({
      bookId,
      wordsWritten: 3.5,
    })
    expect(result.success).toBe(false)
  })
})

describe("Writing Sessions GET", () => {
  it("returns sessions filtered by bookId", () => {
    db.insert(writingSessions).values({ id: nanoid(), bookId, wordsWritten: 100 }).run()
    db.insert(writingSessions).values({ id: nanoid(), bookId, wordsWritten: 200 }).run()

    const otherBookId = nanoid()
    db.insert(books).values({ id: otherBookId, title: "Other Book" }).run()
    db.insert(writingSessions).values({ id: nanoid(), bookId: otherBookId, wordsWritten: 300 }).run()

    const result = db
      .select()
      .from(writingSessions)
      .where(eq(writingSessions.bookId, bookId))
      .orderBy(desc(writingSessions.startedAt))
      .all()

    expect(result).toHaveLength(2)
    expect(result.every((s) => s.bookId === bookId)).toBe(true)
  })

  it("returns empty array when no sessions exist for bookId", () => {
    const result = db
      .select()
      .from(writingSessions)
      .where(eq(writingSessions.bookId, bookId))
      .all()

    expect(result).toHaveLength(0)
  })

  it("respects limit", () => {
    for (let i = 0; i < 5; i++) {
      db.insert(writingSessions).values({ id: nanoid(), bookId, wordsWritten: i * 100 }).run()
    }

    const result = db
      .select()
      .from(writingSessions)
      .where(eq(writingSessions.bookId, bookId))
      .limit(3)
      .all()

    expect(result).toHaveLength(3)
  })
})
