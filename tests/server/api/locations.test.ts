import { describe, it, expect, vi, beforeEach } from "vitest"
import { createTestDb } from "../../setup/test-db"
import { nanoid } from "nanoid"

const { db, sqlite } = createTestDb()

vi.mock("../../../server/database", () => ({ db }))

import { books, locations } from "../../../server/database/schema"
import { eq } from "drizzle-orm"

let bookId: string

beforeEach(() => {
  sqlite.exec("DELETE FROM locations")
  sqlite.exec("DELETE FROM books")
  bookId = nanoid()
  db.insert(books).values({ id: bookId, title: "Test Book" }).run()
})

describe("Locations CRUD", () => {
  it("lists locations by bookId", () => {
    db.insert(locations).values({ id: nanoid(), bookId, name: "Library" }).run()
    db.insert(locations).values({ id: nanoid(), bookId, name: "Park" }).run()
    const result = db.select().from(locations).where(eq(locations.bookId, bookId)).all()
    expect(result).toHaveLength(2)
  })

  it("creates a location with minimal fields", () => {
    const id = nanoid()
    db.insert(locations).values({ id, bookId, name: "Library" }).run()
    const loc = db.select().from(locations).where(eq(locations.id, id)).get()!
    expect(loc.name).toBe("Library")
    expect(loc.description).toBeNull()
  })

  it("creates a location with all fields", () => {
    const id = nanoid()
    db.insert(locations).values({
      id,
      bookId,
      name: "Library",
      description: "A dusty old library",
      sensoryDetails: "Smell of old paper",
      emotionalTone: "Nostalgic",
    }).run()
    const loc = db.select().from(locations).where(eq(locations.id, id)).get()!
    expect(loc.sensoryDetails).toBe("Smell of old paper")
    expect(loc.emotionalTone).toBe("Nostalgic")
  })

  it("updates a location", () => {
    const id = nanoid()
    db.insert(locations).values({ id, bookId, name: "Library" }).run()
    db.update(locations).set({ name: "Old Library", description: "Updated" }).where(eq(locations.id, id)).run()
    const loc = db.select().from(locations).where(eq(locations.id, id)).get()!
    expect(loc.name).toBe("Old Library")
    expect(loc.description).toBe("Updated")
  })

  it("deletes a location", () => {
    const id = nanoid()
    db.insert(locations).values({ id, bookId, name: "Library" }).run()
    db.delete(locations).where(eq(locations.id, id)).run()
    expect(db.select().from(locations).where(eq(locations.id, id)).get()).toBeUndefined()
  })
})
