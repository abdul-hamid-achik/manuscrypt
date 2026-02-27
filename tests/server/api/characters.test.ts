import { describe, it, expect, vi, beforeEach } from "vitest"
import { createTestDb } from "../../setup/test-db"
import { nanoid } from "nanoid"

const { db, sqlite } = createTestDb()

vi.mock("../../../server/database", () => ({ db }))

import { books, characters } from "../../../server/database/schema"
import { eq } from "drizzle-orm"

let bookId: string

beforeEach(() => {
  sqlite.exec("DELETE FROM characters")
  sqlite.exec("DELETE FROM books")
  bookId = nanoid()
  db.insert(books).values({ id: bookId, title: "Test Book" }).run()
})

describe("Characters CRUD", () => {
  it("lists characters by bookId", () => {
    db.insert(characters).values({ id: nanoid(), bookId, name: "Alice" }).run()
    db.insert(characters).values({ id: nanoid(), bookId, name: "Bob" }).run()
    const result = db.select().from(characters).where(eq(characters.bookId, bookId)).all()
    expect(result).toHaveLength(2)
  })

  it("creates a character with minimal fields", () => {
    const id = nanoid()
    db.insert(characters).values({ id, bookId, name: "Alice" }).run()
    const char = db.select().from(characters).where(eq(characters.id, id)).get()!
    expect(char.name).toBe("Alice")
    expect(char.role).toBeNull()
  })

  it("creates a character with all fields", () => {
    const id = nanoid()
    db.insert(characters).values({
      id,
      bookId,
      name: "Alice",
      role: "Protagonist",
      age: "30",
      archetype: "Hero",
      description: "A brave woman",
      motivation: "Save the world",
      fear: "Failure",
      contradiction: "Wants peace but resorts to violence",
      voiceNotes: "Speaks softly",
      traits: "brave, kind",
      backstory: "Grew up in a small village",
    }).run()
    const char = db.select().from(characters).where(eq(characters.id, id)).get()!
    expect(char.role).toBe("Protagonist")
    expect(char.archetype).toBe("Hero")
    expect(char.contradiction).toBe("Wants peace but resorts to violence")
  })

  it("updates a character", () => {
    const id = nanoid()
    db.insert(characters).values({ id, bookId, name: "Alice" }).run()
    db.update(characters).set({ name: "Alicia", role: "Antagonist" }).where(eq(characters.id, id)).run()
    const char = db.select().from(characters).where(eq(characters.id, id)).get()!
    expect(char.name).toBe("Alicia")
    expect(char.role).toBe("Antagonist")
  })

  it("deletes a character", () => {
    const id = nanoid()
    db.insert(characters).values({ id, bookId, name: "Alice" }).run()
    db.delete(characters).where(eq(characters.id, id)).run()
    expect(db.select().from(characters).where(eq(characters.id, id)).get()).toBeUndefined()
  })

  it("does not return characters from other books", () => {
    const otherBookId = nanoid()
    db.insert(books).values({ id: otherBookId, title: "Other" }).run()
    db.insert(characters).values({ id: nanoid(), bookId, name: "Alice" }).run()
    db.insert(characters).values({ id: nanoid(), bookId: otherBookId, name: "Bob" }).run()
    const result = db.select().from(characters).where(eq(characters.bookId, bookId)).all()
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("Alice")
  })
})
