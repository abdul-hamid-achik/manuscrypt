import { describe, it, expect, vi, beforeEach } from "vitest"
import { createTestDb } from "../../setup/test-db"
import { nanoid } from "nanoid"

const { db, sqlite } = createTestDb()

vi.mock("../../../server/database", () => ({ db }))

// Stub Nuxt auto-imports
vi.stubGlobal("defineEventHandler", (handler: Function) => handler)
vi.stubGlobal("readBody", vi.fn())
vi.stubGlobal("getQuery", vi.fn())
vi.stubGlobal("createError", (opts: { statusCode: number; message: string }) => {
  const err = new Error(opts.message) as Error & { statusCode: number }
  err.statusCode = opts.statusCode
  return err
})

const postHandler = (await import("../../../server/api/ai/messages/index.post")).default
const getHandler = (await import("../../../server/api/ai/messages/index.get")).default
const deleteHandler = (await import("../../../server/api/ai/messages/index.delete")).default

import { books, aiMessages } from "../../../server/database/schema"

const BOOK_ID = "test-book-1"

beforeEach(() => {
  sqlite.exec("DELETE FROM ai_messages")
  sqlite.exec("DELETE FROM books")
  db.insert(books).values({ id: BOOK_ID, title: "Test Book" }).run()
})

describe("POST /api/ai/messages", () => {
  it("creates a message with valid data", async () => {
    const body = {
      bookId: BOOK_ID,
      role: "user",
      content: "Hello AI",
      sessionType: "chat",
      sessionId: "sess-1",
    }
    vi.mocked(readBody).mockResolvedValue(body)

    const result = await postHandler({} as any)
    expect(result).toHaveProperty("id")
    expect(typeof result.id).toBe("string")

    // Verify it's in the DB
    const all = db.select().from(aiMessages).all()
    expect(all).toHaveLength(1)
    expect(all[0].content).toBe("Hello AI")
    expect(all[0].role).toBe("user")
    expect(all[0].bookId).toBe(BOOK_ID)
  })

  it("creates a message with optional characterId", async () => {
    const body = {
      bookId: BOOK_ID,
      role: "assistant",
      content: "Response from AI",
      sessionType: "interview",
      sessionId: "sess-2",
      characterId: "char-1",
    }
    vi.mocked(readBody).mockResolvedValue(body)

    const result = await postHandler({} as any)
    expect(result).toHaveProperty("id")

    const all = db.select().from(aiMessages).all()
    expect(all).toHaveLength(1)
    expect(all[0].characterId).toBe("char-1")
  })

  it("rejects invalid input (missing required fields)", async () => {
    vi.mocked(readBody).mockResolvedValue({
      bookId: BOOK_ID,
      // missing role, content, sessionType, sessionId
    })

    await expect(postHandler({} as any)).rejects.toThrow()
  })

  it("rejects empty content", async () => {
    vi.mocked(readBody).mockResolvedValue({
      bookId: BOOK_ID,
      role: "user",
      content: "",
      sessionType: "chat",
      sessionId: "sess-1",
    })

    await expect(postHandler({} as any)).rejects.toThrow()
  })

  it("rejects invalid role", async () => {
    vi.mocked(readBody).mockResolvedValue({
      bookId: BOOK_ID,
      role: "system",
      content: "Hello",
      sessionType: "chat",
      sessionId: "sess-1",
    })

    await expect(postHandler({} as any)).rejects.toThrow()
  })
})

describe("GET /api/ai/messages", () => {
  it("lists messages by bookId", async () => {
    // Insert some messages directly
    db.insert(aiMessages)
      .values({ id: nanoid(), bookId: BOOK_ID, role: "user", content: "Msg 1" })
      .run()
    db.insert(aiMessages)
      .values({ id: nanoid(), bookId: BOOK_ID, role: "assistant", content: "Msg 2" })
      .run()

    vi.mocked(getQuery).mockReturnValue({ bookId: BOOK_ID })

    const result = await getHandler({} as any)
    expect(result).toHaveLength(2)
    expect(result[0].content).toBe("Msg 1")
    expect(result[1].content).toBe("Msg 2")
  })

  it("filters by characterId when provided", async () => {
    db.insert(aiMessages)
      .values({ id: nanoid(), bookId: BOOK_ID, role: "user", content: "General msg" })
      .run()
    db.insert(aiMessages)
      .values({
        id: nanoid(),
        bookId: BOOK_ID,
        role: "user",
        content: "Character msg",
        characterId: "char-1",
      })
      .run()

    vi.mocked(getQuery).mockReturnValue({ bookId: BOOK_ID, characterId: "char-1" })

    const result = await getHandler({} as any)
    expect(result).toHaveLength(1)
    expect(result[0].content).toBe("Character msg")
  })

  it("returns only messages with null characterId when no characterId param", async () => {
    db.insert(aiMessages)
      .values({ id: nanoid(), bookId: BOOK_ID, role: "user", content: "General msg" })
      .run()
    db.insert(aiMessages)
      .values({
        id: nanoid(),
        bookId: BOOK_ID,
        role: "user",
        content: "Character msg",
        characterId: "char-1",
      })
      .run()

    vi.mocked(getQuery).mockReturnValue({ bookId: BOOK_ID })

    const result = await getHandler({} as any)
    expect(result).toHaveLength(1)
    expect(result[0].content).toBe("General msg")
  })

  it("throws 400 when bookId is missing", async () => {
    vi.mocked(getQuery).mockReturnValue({})

    await expect(getHandler({} as any)).rejects.toThrow("bookId query param is required")
  })
})

describe("DELETE /api/ai/messages", () => {
  it("deletes messages by bookId", async () => {
    db.insert(aiMessages)
      .values({ id: nanoid(), bookId: BOOK_ID, role: "user", content: "To delete" })
      .run()

    vi.mocked(getQuery).mockReturnValue({ bookId: BOOK_ID })

    const result = await deleteHandler({} as any)
    expect(result).toEqual({ success: true })

    const remaining = db.select().from(aiMessages).all()
    expect(remaining).toHaveLength(0)
  })

  it("only deletes messages matching characterId filter", async () => {
    db.insert(aiMessages)
      .values({ id: nanoid(), bookId: BOOK_ID, role: "user", content: "Keep" })
      .run()
    db.insert(aiMessages)
      .values({
        id: nanoid(),
        bookId: BOOK_ID,
        role: "user",
        content: "Delete me",
        characterId: "char-1",
      })
      .run()

    vi.mocked(getQuery).mockReturnValue({ bookId: BOOK_ID, characterId: "char-1" })

    await deleteHandler({} as any)

    const remaining = db.select().from(aiMessages).all()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].content).toBe("Keep")
  })

  it("throws 400 when bookId is missing", async () => {
    vi.mocked(getQuery).mockReturnValue({})

    await expect(deleteHandler({} as any)).rejects.toThrow("bookId query param is required")
  })
})
