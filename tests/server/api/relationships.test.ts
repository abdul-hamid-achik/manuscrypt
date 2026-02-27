import { describe, it, expect, vi, beforeEach } from "vitest"
import { createTestDb } from "../../setup/test-db"
import { nanoid } from "nanoid"

const { db, sqlite } = createTestDb()

vi.mock("../../../server/database", () => ({ db }))

import { books, characters, characterRelationships } from "../../../server/database/schema"
import { eq } from "drizzle-orm"

let bookId: string
let char1Id: string
let char2Id: string

beforeEach(() => {
  sqlite.exec("DELETE FROM character_relationships")
  sqlite.exec("DELETE FROM characters")
  sqlite.exec("DELETE FROM books")
  bookId = nanoid()
  char1Id = nanoid()
  char2Id = nanoid()
  db.insert(books).values({ id: bookId, title: "Test Book" }).run()
  db.insert(characters).values({ id: char1Id, bookId, name: "Alice" }).run()
  db.insert(characters).values({ id: char2Id, bookId, name: "Bob" }).run()
})

describe("Relationships CRUD", () => {
  it("lists relationships by bookId", () => {
    db.insert(characterRelationships).values({
      id: nanoid(),
      bookId,
      fromCharacterId: char1Id,
      toCharacterId: char2Id,
      relationshipType: "friend",
    }).run()
    const result = db.select().from(characterRelationships).where(eq(characterRelationships.bookId, bookId)).all()
    expect(result).toHaveLength(1)
  })

  it("creates a relationship", () => {
    const id = nanoid()
    db.insert(characterRelationships).values({
      id,
      bookId,
      fromCharacterId: char1Id,
      toCharacterId: char2Id,
      relationshipType: "rival",
      description: "They compete for the same goal",
    }).run()
    const rel = db.select().from(characterRelationships).where(eq(characterRelationships.id, id)).get()!
    expect(rel.relationshipType).toBe("rival")
    expect(rel.description).toBe("They compete for the same goal")
  })

  it("updates a relationship", () => {
    const id = nanoid()
    db.insert(characterRelationships).values({
      id,
      bookId,
      fromCharacterId: char1Id,
      toCharacterId: char2Id,
      relationshipType: "friend",
    }).run()
    db.update(characterRelationships).set({ relationshipType: "enemy", description: "Betrayal" }).where(eq(characterRelationships.id, id)).run()
    const rel = db.select().from(characterRelationships).where(eq(characterRelationships.id, id)).get()!
    expect(rel.relationshipType).toBe("enemy")
    expect(rel.description).toBe("Betrayal")
  })

  it("deletes a relationship", () => {
    const id = nanoid()
    db.insert(characterRelationships).values({
      id,
      bookId,
      fromCharacterId: char1Id,
      toCharacterId: char2Id,
      relationshipType: "friend",
    }).run()
    db.delete(characterRelationships).where(eq(characterRelationships.id, id)).run()
    expect(db.select().from(characterRelationships).where(eq(characterRelationships.id, id)).get()).toBeUndefined()
  })

  it("cascades delete when character is deleted", () => {
    db.insert(characterRelationships).values({
      id: nanoid(),
      bookId,
      fromCharacterId: char1Id,
      toCharacterId: char2Id,
      relationshipType: "friend",
    }).run()
    db.delete(characters).where(eq(characters.id, char1Id)).run()
    const remaining = db.select().from(characterRelationships).where(eq(characterRelationships.bookId, bookId)).all()
    expect(remaining).toHaveLength(0)
  })
})
