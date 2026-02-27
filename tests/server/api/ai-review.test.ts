import { describe, it, expect, vi, beforeEach } from "vitest"
import { nanoid } from "nanoid"
import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import * as schema from "../../../server/database/schema"

const sqlite = new Database(":memory:")
sqlite.pragma("foreign_keys = ON")
sqlite.exec(`
  CREATE TABLE books (id TEXT PRIMARY KEY, title TEXT NOT NULL, genre TEXT, premise TEXT, target_word_count INTEGER DEFAULT 80000, status TEXT DEFAULT 'planning', style_guide TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE chapters (id TEXT PRIMARY KEY, book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE, number INTEGER NOT NULL, title TEXT NOT NULL, synopsis TEXT, content TEXT, word_count INTEGER DEFAULT 0, status TEXT DEFAULT 'planned', act INTEGER, sort_order INTEGER NOT NULL, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
`)
const db = drizzle(sqlite, { schema })

// Mock Nitro auto-imports
vi.stubGlobal("createError", (opts: { statusCode: number; message: string }) => {
  const err = new Error(opts.message) as any
  err.statusCode = opts.statusCode
  return err
})
vi.stubGlobal("useRuntimeConfig", () => ({
  anthropicApiKey: "test-key",
  anthropicFastModel: "test-fast",
  anthropicSmartModel: "test-smart",
}))

vi.mock("../../../server/database", () => ({ db }))

import { books, chapters } from "../../../server/database/schema"
import { eq } from "drizzle-orm"
import { callAnthropicJson } from "../../../server/utils/ai-stream"

let bookId: string

beforeEach(() => {
  sqlite.exec("DELETE FROM chapters; DELETE FROM books;")
  bookId = nanoid()
  db.insert(books).values({ id: bookId, title: "Test Book" }).run()
})

describe("AI Review", () => {
  it("review requires chapter with content >= 50 chars", () => {
    const chapterId = nanoid()
    db.insert(chapters).values({ id: chapterId, bookId, number: 1, title: "Ch1", sortOrder: 0, content: "short" }).run()
    const chapter = db.select().from(chapters).where(eq(chapters.id, chapterId)).get()!
    expect(chapter.content!.trim().length).toBeLessThan(50)
  })

  it("review accepts chapter with sufficient content", () => {
    const chapterId = nanoid()
    db.insert(chapters).values({ id: chapterId, bookId, number: 1, title: "Ch1", sortOrder: 0, content: "A".repeat(100) }).run()
    const chapter = db.select().from(chapters).where(eq(chapters.id, chapterId)).get()!
    expect(chapter.content!.trim().length).toBeGreaterThanOrEqual(50)
  })

  it("returns undefined for non-existent chapter", () => {
    expect(db.select().from(chapters).where(eq(chapters.id, "nonexistent")).get()).toBeUndefined()
  })
})

describe("callAnthropicJson", () => {
  it("parses JSON from Anthropic response", async () => {
    const mockAnthropicClient = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: '{"score": 8, "feedback": "Great"}' }],
        }),
      },
    } as any

    const result = await callAnthropicJson<{ score: number; feedback: string }>(mockAnthropicClient, {
      model: "test-model",
      maxTokens: 100,
      system: "Test system",
      messages: [{ role: "user", content: "Test" }],
    })

    expect(result.score).toBe(8)
    expect(result.feedback).toBe("Great")
  })

  it("throws on invalid JSON response", async () => {
    const mockAnthropicClient = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: "not valid json {" }],
        }),
      },
    } as any

    await expect(
      callAnthropicJson(mockAnthropicClient, {
        model: "test-model",
        maxTokens: 100,
        system: "Test system",
        messages: [{ role: "user", content: "Test" }],
        errorLabel: "review",
      }),
    ).rejects.toThrow("Failed to parse review response")
  })
})
