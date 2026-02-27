import { describe, it, expect, vi, beforeEach } from "vitest"
import { createTestDb } from "../../setup/test-db"
import { nanoid } from "nanoid"

const { db, sqlite } = createTestDb()

vi.mock("../../../server/database", () => ({ db }))

import { books, chapters, scenes } from "../../../server/database/schema"
import { eq, asc } from "drizzle-orm"

let bookId: string
let chapterId: string

beforeEach(() => {
  sqlite.exec("DELETE FROM scenes")
  sqlite.exec("DELETE FROM chapters")
  sqlite.exec("DELETE FROM books")
  bookId = nanoid()
  chapterId = nanoid()
  db.insert(books).values({ id: bookId, title: "Test Book" }).run()
  db.insert(chapters).values({ id: chapterId, bookId, number: 1, title: "Chapter 1", sortOrder: 0 }).run()
})

describe("Scenes CRUD", () => {
  it("lists scenes by chapterId ordered by sortOrder", () => {
    db.insert(scenes).values({ id: nanoid(), chapterId, title: "Scene B", sortOrder: 2 }).run()
    db.insert(scenes).values({ id: nanoid(), chapterId, title: "Scene A", sortOrder: 1 }).run()
    const result = db.select().from(scenes).where(eq(scenes.chapterId, chapterId)).orderBy(asc(scenes.sortOrder)).all()
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe("Scene A")
    expect(result[1].title).toBe("Scene B")
  })

  it("creates a scene with minimal fields", () => {
    const id = nanoid()
    db.insert(scenes).values({ id, chapterId, title: "Opening", sortOrder: 0 }).run()
    const scene = db.select().from(scenes).where(eq(scenes.id, id)).get()!
    expect(scene.title).toBe("Opening")
    expect(scene.status).toBe("planned")
  })

  it("creates a scene with all fields", () => {
    const id = nanoid()
    db.insert(scenes).values({
      id,
      chapterId,
      title: "The Confrontation",
      synopsis: "Alice meets Bob",
      povCharacterId: "char-1",
      locationId: "loc-1",
      moodStart: "tense",
      moodEnd: "resolved",
      targetWordCount: 2000,
      sortOrder: 0,
    }).run()
    const scene = db.select().from(scenes).where(eq(scenes.id, id)).get()!
    expect(scene.synopsis).toBe("Alice meets Bob")
    expect(scene.moodStart).toBe("tense")
    expect(scene.targetWordCount).toBe(2000)
  })

  it("updates a scene", () => {
    const id = nanoid()
    db.insert(scenes).values({ id, chapterId, title: "Original", sortOrder: 0 }).run()
    db.update(scenes).set({ title: "Updated", status: "writing" }).where(eq(scenes.id, id)).run()
    const scene = db.select().from(scenes).where(eq(scenes.id, id)).get()!
    expect(scene.title).toBe("Updated")
    expect(scene.status).toBe("writing")
  })

  it("deletes a scene", () => {
    const id = nanoid()
    db.insert(scenes).values({ id, chapterId, title: "To Delete", sortOrder: 0 }).run()
    db.delete(scenes).where(eq(scenes.id, id)).run()
    expect(db.select().from(scenes).where(eq(scenes.id, id)).get()).toBeUndefined()
  })

  it("does not return scenes from other chapters", () => {
    const otherChapterId = nanoid()
    db.insert(chapters).values({ id: otherChapterId, bookId, number: 2, title: "Ch2", sortOrder: 1 }).run()
    db.insert(scenes).values({ id: nanoid(), chapterId, title: "S1", sortOrder: 0 }).run()
    db.insert(scenes).values({ id: nanoid(), chapterId: otherChapterId, title: "S2", sortOrder: 0 }).run()
    const result = db.select().from(scenes).where(eq(scenes.chapterId, chapterId)).all()
    expect(result).toHaveLength(1)
  })
})
