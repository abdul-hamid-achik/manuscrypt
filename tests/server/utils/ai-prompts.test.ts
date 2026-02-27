import { describe, it, expect, vi, beforeEach } from "vitest"
import { nanoid } from "nanoid"

const { db, sqlite } = vi.hoisted(() => {
  const Database = require("better-sqlite3")
  const { drizzle } = require("drizzle-orm/better-sqlite3")

  const sqlite = new Database(":memory:")
  sqlite.pragma("foreign_keys = ON")
  sqlite.exec(`
    CREATE TABLE books (id TEXT PRIMARY KEY, title TEXT NOT NULL, genre TEXT, premise TEXT, target_word_count INTEGER DEFAULT 80000, status TEXT DEFAULT 'planning', style_guide TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE chapters (id TEXT PRIMARY KEY, book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE, number INTEGER NOT NULL, title TEXT NOT NULL, synopsis TEXT, content TEXT, word_count INTEGER DEFAULT 0, status TEXT DEFAULT 'planned', act INTEGER, sort_order INTEGER NOT NULL, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE characters (id TEXT PRIMARY KEY, book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE, name TEXT NOT NULL, role TEXT, age TEXT, archetype TEXT, description TEXT, motivation TEXT, fear TEXT, contradiction TEXT, voice_notes TEXT, traits TEXT, backstory TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
  `)
  const db = drizzle(sqlite)
  return { db, sqlite }
})

vi.mock("../../../server/database", () => ({ db }))

import { books, chapters, characters } from "../../../server/database/schema"
import { buildBookContext, buildSystemPrompt } from "../../../server/utils/ai-prompts"

beforeEach(() => {
  sqlite.exec("DELETE FROM characters; DELETE FROM chapters; DELETE FROM books;")
})

describe("buildBookContext", () => {
  it("returns defaults when book not found", () => {
    const ctx = buildBookContext("nonexistent")
    expect(ctx.title).toBe("Untitled")
    expect(ctx.genre).toBe("Literary Fiction")
    expect(ctx.characters).toHaveLength(0)
    expect(ctx.chapterSynopsis).toBeNull()
    expect(ctx.currentContent).toBeNull()
  })

  it("returns book context with characters", () => {
    const bookId = nanoid()
    db.insert(books).values({ id: bookId, title: "My Novel", genre: "Thriller", premise: "A dark tale" }).run()
    db.insert(characters).values({ id: nanoid(), bookId, name: "Alice", role: "Protagonist", motivation: "Justice" }).run()
    db.insert(characters).values({ id: nanoid(), bookId, name: "Bob", role: "Antagonist" }).run()

    const ctx = buildBookContext(bookId)
    expect(ctx.title).toBe("My Novel")
    expect(ctx.genre).toBe("Thriller")
    expect(ctx.premise).toBe("A dark tale")
    expect(ctx.characters).toHaveLength(2)
    expect(ctx.characters[0].name).toBe("Alice")
    expect(ctx.characters[0].motivation).toBe("Justice")
  })

  it("includes chapter synopsis and content when chapterId provided", () => {
    const bookId = nanoid()
    const chapterId = nanoid()
    db.insert(books).values({ id: bookId, title: "My Novel" }).run()
    db.insert(chapters).values({
      id: chapterId,
      bookId,
      number: 1,
      title: "Chapter One",
      synopsis: "The beginning",
      content: '{"type":"doc","content":[]}',
      sortOrder: 0,
    }).run()

    const ctx = buildBookContext(bookId, chapterId)
    expect(ctx.chapterSynopsis).toBe("The beginning")
    expect(ctx.currentContent).toBe('{"type":"doc","content":[]}')
  })

  it("handles missing chapter gracefully", () => {
    const bookId = nanoid()
    db.insert(books).values({ id: bookId, title: "My Novel" }).run()

    const ctx = buildBookContext(bookId, "nonexistent")
    expect(ctx.chapterSynopsis).toBeNull()
    expect(ctx.currentContent).toBeNull()
  })
})

describe("buildSystemPrompt", () => {
  const baseCtx = {
    title: "Test Novel",
    genre: "Literary Fiction",
    premise: "A story about growth",
    styleGuide: "Write in third person",
    characters: [
      {
        name: "Alice",
        role: "Protagonist",
        description: "A young woman",
        motivation: "Find truth",
        fear: "Loneliness",
        contradiction: "Wants connection but pushes people away",
        voiceNotes: null,
      },
    ],
    chapterSynopsis: "Alice arrives in town",
    currentContent: null,
  }

  it("includes book title and genre", () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain('Test Novel')
    expect(prompt).toContain("Literary Fiction")
  })

  it("includes premise and style guide", () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain("A story about growth")
    expect(prompt).toContain("Write in third person")
  })

  it("includes character details", () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain("Alice")
    expect(prompt).toContain("Protagonist")
    expect(prompt).toContain("Find truth")
    expect(prompt).toContain("Loneliness")
  })

  it("includes chapter synopsis", () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain("Alice arrives in town")
  })

  it("generates continue command prompt", () => {
    const prompt = buildSystemPrompt(baseCtx, "continue")
    expect(prompt).toContain("Continue writing the narrative")
  })

  it("generates deepen command prompt", () => {
    const prompt = buildSystemPrompt(baseCtx, "deepen")
    expect(prompt).toContain("greater psychological depth")
  })

  it("generates dialogue command prompt", () => {
    const prompt = buildSystemPrompt(baseCtx, "dialogue")
    expect(prompt).toContain("authentic dialogue")
  })

  it("generates sensory command prompt", () => {
    const prompt = buildSystemPrompt(baseCtx, "sensory")
    expect(prompt).toContain("sensory details")
  })

  it("generates default assistant prompt for unknown command", () => {
    const prompt = buildSystemPrompt(baseCtx, undefined)
    expect(prompt).toContain("thoughtful writing assistant")
  })

  it("handles minimal context", () => {
    const ctx = {
      title: "Untitled",
      genre: null,
      premise: null,
      styleGuide: null,
      characters: [],
      chapterSynopsis: null,
      currentContent: null,
    }
    const prompt = buildSystemPrompt(ctx)
    expect(prompt).toContain("Untitled")
    expect(prompt).not.toContain("Key Characters")
    expect(prompt).not.toContain("Chapter Synopsis")
  })
})
