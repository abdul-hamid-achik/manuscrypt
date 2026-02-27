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
  CREATE TABLE scenes (id TEXT PRIMARY KEY, chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE, title TEXT NOT NULL, synopsis TEXT, pov_character_id TEXT, location_id TEXT, mood_start TEXT, mood_end TEXT, target_word_count INTEGER, status TEXT DEFAULT 'planned', sort_order INTEGER NOT NULL, created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE characters (id TEXT PRIMARY KEY, book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE, name TEXT NOT NULL, role TEXT, age TEXT, archetype TEXT, description TEXT, motivation TEXT, fear TEXT, contradiction TEXT, voice_notes TEXT, traits TEXT, backstory TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE character_relationships (id TEXT PRIMARY KEY, book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE, from_character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE, to_character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE, relationship_type TEXT NOT NULL, description TEXT);
  CREATE TABLE locations (id TEXT PRIMARY KEY, book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE, name TEXT NOT NULL, description TEXT, sensory_details TEXT, emotional_tone TEXT, created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE ai_messages (id TEXT PRIMARY KEY, book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE, chapter_id TEXT, character_id TEXT, role TEXT NOT NULL, content TEXT NOT NULL, command TEXT, created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE writing_sessions (id TEXT PRIMARY KEY, book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE, chapter_id TEXT, words_written INTEGER DEFAULT 0, duration INTEGER, started_at TEXT DEFAULT (datetime('now')), ended_at TEXT);
`)
const db = drizzle(sqlite, { schema })

vi.mock("../../../server/database", () => ({ db }))

import { books, chapters, characters, locations, characterRelationships, scenes } from "../../../server/database/schema"
import { eq, asc } from "drizzle-orm"

function insertBook(overrides: Partial<{ id: string; title: string }> = {}) {
  const id = overrides.id ?? nanoid()
  db.insert(books).values({ id, title: overrides.title ?? "Test Book" }).run()
  return id
}

function insertChapter(bookId: string, overrides: Partial<{ id: string; number: number; sortOrder: number; title: string }> = {}) {
  const id = overrides.id ?? nanoid()
  db.insert(chapters).values({ id, bookId, number: overrides.number ?? 1, title: overrides.title ?? "Chapter One", sortOrder: overrides.sortOrder ?? 0 }).run()
  return id
}

function insertCharacter(bookId: string, overrides: Partial<{ id: string; name: string }> = {}) {
  const id = overrides.id ?? nanoid()
  db.insert(characters).values({ id, bookId, name: overrides.name ?? "Test Character" }).run()
  return id
}

function insertLocation(bookId: string, overrides: Partial<{ id: string; name: string }> = {}) {
  const id = overrides.id ?? nanoid()
  db.insert(locations).values({ id, bookId, name: overrides.name ?? "Test Location" }).run()
  return id
}

function insertScene(chapterId: string, overrides: Partial<{ id: string; title: string; sortOrder: number }> = {}) {
  const id = overrides.id ?? nanoid()
  db.insert(scenes).values({ id, chapterId, title: overrides.title ?? "Test Scene", sortOrder: overrides.sortOrder ?? 0 }).run()
  return id
}

function insertRelationship(bookId: string, fromId: string, toId: string) {
  const id = nanoid()
  db.insert(characterRelationships).values({ id, bookId, fromCharacterId: fromId, toCharacterId: toId, relationshipType: "friend" }).run()
  return id
}

beforeEach(() => {
  sqlite.exec("DELETE FROM writing_sessions; DELETE FROM ai_messages; DELETE FROM scenes; DELETE FROM character_relationships; DELETE FROM characters; DELETE FROM locations; DELETE FROM chapters; DELETE FROM books;")
})

describe("CRUD pattern: get by id", () => {
  it("returns a record by id", () => {
    const bookId = insertBook({ title: "My Book" })
    const record = db.select().from(books).where(eq(books.id, bookId)).get()
    expect(record).toBeDefined()
    expect(record!.title).toBe("My Book")
  })

  it("returns undefined for non-existent id", () => {
    const record = db.select().from(books).where(eq(books.id, "nonexistent")).get()
    expect(record).toBeUndefined()
  })

  it("works for chapters", () => {
    const bookId = insertBook()
    const chapterId = insertChapter(bookId, { title: "First" })
    const chapter = db.select().from(chapters).where(eq(chapters.id, chapterId)).get()
    expect(chapter!.title).toBe("First")
  })

  it("works for characters", () => {
    const bookId = insertBook()
    const charId = insertCharacter(bookId, { name: "Alice" })
    const char = db.select().from(characters).where(eq(characters.id, charId)).get()
    expect(char!.name).toBe("Alice")
  })

  it("works for locations", () => {
    const bookId = insertBook()
    const locId = insertLocation(bookId, { name: "Library" })
    const loc = db.select().from(locations).where(eq(locations.id, locId)).get()
    expect(loc!.name).toBe("Library")
  })
})

describe("CRUD pattern: delete by id", () => {
  it("deletes a record", () => {
    const bookId = insertBook()
    db.delete(books).where(eq(books.id, bookId)).run()
    expect(db.select().from(books).where(eq(books.id, bookId)).get()).toBeUndefined()
  })

  it("cascades deletes from book to chapters", () => {
    const bookId = insertBook()
    insertChapter(bookId)
    db.delete(books).where(eq(books.id, bookId)).run()
    expect(db.select().from(chapters).where(eq(chapters.bookId, bookId)).all()).toHaveLength(0)
  })

  it("cascades deletes from book to characters", () => {
    const bookId = insertBook()
    insertCharacter(bookId)
    db.delete(books).where(eq(books.id, bookId)).run()
    expect(db.select().from(characters).where(eq(characters.bookId, bookId)).all()).toHaveLength(0)
  })

  it("cascades deletes from chapter to scenes", () => {
    const bookId = insertBook()
    const chapterId = insertChapter(bookId)
    insertScene(chapterId)
    db.delete(chapters).where(eq(chapters.id, chapterId)).run()
    expect(db.select().from(scenes).where(eq(scenes.chapterId, chapterId)).all()).toHaveLength(0)
  })
})

describe("CRUD pattern: list by parent", () => {
  it("lists chapters by bookId ordered by sortOrder", () => {
    const bookId = insertBook()
    insertChapter(bookId, { title: "B", sortOrder: 2 })
    insertChapter(bookId, { title: "A", sortOrder: 1 })
    const result = db.select().from(chapters).where(eq(chapters.bookId, bookId)).orderBy(asc(chapters.sortOrder)).all()
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe("A")
    expect(result[1].title).toBe("B")
  })

  it("lists characters by bookId", () => {
    const bookId = insertBook()
    insertCharacter(bookId, { name: "Alice" })
    insertCharacter(bookId, { name: "Bob" })
    expect(db.select().from(characters).where(eq(characters.bookId, bookId)).all()).toHaveLength(2)
  })

  it("lists scenes by chapterId ordered by sortOrder", () => {
    const bookId = insertBook()
    const chapterId = insertChapter(bookId)
    insertScene(chapterId, { title: "B", sortOrder: 2 })
    insertScene(chapterId, { title: "A", sortOrder: 1 })
    const result = db.select().from(scenes).where(eq(scenes.chapterId, chapterId)).orderBy(asc(scenes.sortOrder)).all()
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe("A")
  })

  it("only returns records for the specified parent", () => {
    const bookId1 = insertBook({ title: "Book 1" })
    const bookId2 = insertBook({ title: "Book 2" })
    insertCharacter(bookId1, { name: "Alice" })
    insertCharacter(bookId2, { name: "Bob" })
    const result = db.select().from(characters).where(eq(characters.bookId, bookId1)).all()
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("Alice")
  })
})
