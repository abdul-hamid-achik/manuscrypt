import { describe, it, expect, vi, beforeEach } from "vitest"
import { nanoid } from "nanoid"

import { books, chapters, characters, locations, characterRelationships, scenes } from "../../../server/database/schema"
import { buildBookContext, buildSystemPrompt } from "../../../server/utils/ai-prompts"

const { db, sqlite } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3")
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/better-sqlite3")

  const sqlite = new Database(":memory:")
  sqlite.pragma("foreign_keys = ON")
  sqlite.exec(`
    CREATE TABLE books (id TEXT PRIMARY KEY, title TEXT NOT NULL, genre TEXT, premise TEXT, target_word_count INTEGER DEFAULT 80000, status TEXT DEFAULT 'planning', style_guide TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE chapters (id TEXT PRIMARY KEY, book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE, number INTEGER NOT NULL, title TEXT NOT NULL, synopsis TEXT, content TEXT, word_count INTEGER DEFAULT 0, target_word_count INTEGER, status TEXT DEFAULT 'planned', act INTEGER, sort_order INTEGER NOT NULL, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE characters (id TEXT PRIMARY KEY, book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE, name TEXT NOT NULL, role TEXT, age TEXT, archetype TEXT, description TEXT, motivation TEXT, fear TEXT, contradiction TEXT, voice_notes TEXT, traits TEXT, backstory TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE locations (id TEXT PRIMARY KEY, book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE, name TEXT NOT NULL, description TEXT, sensory_details TEXT, emotional_tone TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE character_relationships (id TEXT PRIMARY KEY, book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE, from_character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE, to_character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE, relationship_type TEXT NOT NULL, description TEXT);
    CREATE TABLE scenes (id TEXT PRIMARY KEY, chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE, title TEXT NOT NULL, synopsis TEXT, pov_character_id TEXT, location_id TEXT, mood_start TEXT, mood_end TEXT, target_word_count INTEGER, status TEXT DEFAULT 'planned', sort_order INTEGER NOT NULL, created_at TEXT DEFAULT (datetime('now')));
  `)
  const db = drizzle(sqlite)
  return { db, sqlite }
})

vi.mock("../../../server/database", () => ({ db }))

beforeEach(() => {
  sqlite.exec("DELETE FROM scenes; DELETE FROM character_relationships; DELETE FROM locations; DELETE FROM characters; DELETE FROM chapters; DELETE FROM books;")
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
    // Content is now converted from TipTap JSON to plain text
    expect(ctx.currentContent).toBe("")
  })

  it("handles missing chapter gracefully", () => {
    const bookId = nanoid()
    db.insert(books).values({ id: bookId, title: "My Novel" }).run()

    const ctx = buildBookContext(bookId, "nonexistent")
    expect(ctx.chapterSynopsis).toBeNull()
    expect(ctx.currentContent).toBeNull()
  })

  it("includes locations, relationships, and scenes", () => {
    const bookId = nanoid()
    const chapterId = nanoid()
    const aliceId = nanoid()
    const bobId = nanoid()
    const locationId = nanoid()

    db.insert(books).values({ id: bookId, title: "My Novel" }).run()
    db.insert(characters).values({ id: aliceId, bookId, name: "Alice", role: "Protagonist" }).run()
    db.insert(characters).values({ id: bobId, bookId, name: "Bob", role: "Antagonist" }).run()
    db.insert(locations).values({ id: locationId, bookId, name: "The Library", description: "An old building", sensoryDetails: "Dusty shelves", emotionalTone: "Melancholy" }).run()
    db.insert(characterRelationships).values({ id: nanoid(), bookId, fromCharacterId: aliceId, toCharacterId: bobId, relationshipType: "rivals", description: "Childhood rivals" }).run()
    db.insert(chapters).values({ id: chapterId, bookId, number: 1, title: "Chapter One", synopsis: "They meet", content: '{"type":"doc","content":[]}', sortOrder: 0 }).run()
    db.insert(scenes).values({ id: nanoid(), chapterId, title: "The Encounter", synopsis: "Alice meets Bob", povCharacterId: aliceId, locationId, moodStart: "tense", moodEnd: "curious", sortOrder: 0 }).run()

    const ctx = buildBookContext(bookId, chapterId)
    expect(ctx.locations).toHaveLength(1)
    expect(ctx.locations[0].name).toBe("The Library")
    expect(ctx.locations[0].sensoryDetails).toBe("Dusty shelves")
    expect(ctx.relationships).toHaveLength(1)
    expect(ctx.relationships[0].fromCharacterName).toBe("Alice")
    expect(ctx.relationships[0].toCharacterName).toBe("Bob")
    expect(ctx.relationships[0].relationshipType).toBe("rivals")
    expect(ctx.scenes).toHaveLength(1)
    expect(ctx.scenes[0].title).toBe("The Encounter")
    expect(ctx.scenes[0].povCharacterName).toBe("Alice")
    expect(ctx.scenes[0].locationName).toBe("The Library")
  })

  it("fetches neighboring chapter synopses", () => {
    const bookId = nanoid()
    const ch1Id = nanoid()
    const ch2Id = nanoid()
    const ch3Id = nanoid()

    db.insert(books).values({ id: bookId, title: "My Novel" }).run()
    db.insert(chapters).values({ id: ch1Id, bookId, number: 1, title: "Beginning", synopsis: "Setup", sortOrder: 0 }).run()
    db.insert(chapters).values({ id: ch2Id, bookId, number: 2, title: "Middle", synopsis: "Conflict", sortOrder: 1 }).run()
    db.insert(chapters).values({ id: ch3Id, bookId, number: 3, title: "End", synopsis: "Resolution", sortOrder: 2 }).run()

    const ctx = buildBookContext(bookId, ch2Id)
    expect(ctx.neighboringSynopses).toHaveLength(2)
    expect(ctx.neighboringSynopses[0].title).toBe("Beginning")
    expect(ctx.neighboringSynopses[0].synopsis).toBe("Setup")
    expect(ctx.neighboringSynopses[1].title).toBe("End")
    expect(ctx.neighboringSynopses[1].synopsis).toBe("Resolution")
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
        age: "28",
        archetype: "The Seeker",
        description: "A young woman",
        motivation: "Find truth",
        fear: "Loneliness",
        contradiction: "Wants connection but pushes people away",
        voiceNotes: null,
        traits: "curious, guarded",
        backstory: "Lost her mother at 12",
      },
    ],
    locations: [],
    relationships: [],
    scenes: [],
    neighboringSynopses: [],
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
    expect(prompt).toContain("age 28")
    expect(prompt).toContain("The Seeker")
    expect(prompt).toContain("curious, guarded")
    expect(prompt).toContain("Lost her mother at 12")
  })

  it("includes chapter synopsis", () => {
    const prompt = buildSystemPrompt(baseCtx)
    expect(prompt).toContain("Alice arrives in town")
  })

  it("generates continue command prompt", () => {
    const prompt = buildSystemPrompt(baseCtx, "continue")
    expect(prompt).toContain("Continue writing the narrative")
  })

  it("includes currentContent in continue command", () => {
    const ctxWithContent = { ...baseCtx, currentContent: "She walked into the room and paused." }
    const prompt = buildSystemPrompt(ctxWithContent, "continue")
    expect(prompt).toContain("She walked into the room and paused.")
    expect(prompt).toContain("Current manuscript text")
  })

  it("truncates long currentContent in continue command", () => {
    const longContent = "word ".repeat(2000) // ~10000 chars
    const ctxWithContent = { ...baseCtx, currentContent: longContent }
    const prompt = buildSystemPrompt(ctxWithContent, "continue")
    expect(prompt).toContain("[...]")
    expect(prompt).toContain("Current manuscript text")
  })

  it("does not include currentContent for non-continue commands", () => {
    const ctxWithContent = { ...baseCtx, currentContent: "Some chapter text here." }
    const prompt = buildSystemPrompt(ctxWithContent, "deepen")
    expect(prompt).not.toContain("Current manuscript text")
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

  it("includes selected text in default prompt", () => {
    const prompt = buildSystemPrompt(baseCtx, undefined, "The rain fell softly.")
    expect(prompt).toContain("The rain fell softly.")
    expect(prompt).toContain("respond with ONLY the revised prose")
    expect(prompt).not.toContain("thoughtful writing assistant")
  })

  it("includes selected text in command prompts", () => {
    const prompt = buildSystemPrompt(baseCtx, "deepen", "She walked away.")
    expect(prompt).toContain("She walked away.")
    expect(prompt).toContain("greater psychological depth")
    expect(prompt).toContain("ONLY the rewritten prose")
  })

  it("includes relationship and location context", () => {
    const ctxWithWorld = {
      ...baseCtx,
      locations: [{ name: "The Library", description: "An old building", sensoryDetails: "Dusty shelves", emotionalTone: "Melancholy" }],
      relationships: [{ fromCharacterName: "Alice", toCharacterName: "Bob", relationshipType: "rivals", description: "Childhood rivals" }],
    }
    const prompt = buildSystemPrompt(ctxWithWorld)
    expect(prompt).toContain("The Library")
    expect(prompt).toContain("Dusty shelves")
    expect(prompt).toContain("Alice → Bob (rivals)")
    expect(prompt).toContain("Childhood rivals")
  })

  it("handles minimal context", () => {
    const ctx = {
      title: "Untitled",
      genre: null,
      premise: null,
      styleGuide: null,
      characters: [],
      locations: [],
      relationships: [],
      scenes: [],
      neighboringSynopses: [],
      chapterSynopsis: null,
      currentContent: null,
    }
    const prompt = buildSystemPrompt(ctx)
    expect(prompt).toContain("Untitled")
    expect(prompt).not.toContain("Key Characters")
    expect(prompt).not.toContain("Chapter Synopsis")
  })

  it("generates action command prompt", () => {
    const prompt = buildSystemPrompt(baseCtx, "action")
    expect(prompt).toContain("Write physical action")
    expect(prompt).toContain("body language")
    expect(prompt).toContain("ONLY the rewritten prose")
  })

  it("includes selected text in action command", () => {
    const prompt = buildSystemPrompt(baseCtx, "action", "He ran across the field.")
    expect(prompt).toContain("He ran across the field.")
    expect(prompt).toContain("Write physical action")
  })

  it("generates sensory command with correct task description", () => {
    const prompt = buildSystemPrompt(baseCtx, "sensory")
    expect(prompt).toContain("vivid sensory details")
    expect(prompt).toContain("visual, auditory, olfactory, tactile, gustatory")
    expect(prompt).toContain("ONLY the rewritten prose")
  })

  it("truncates long character backstories with ellipsis", () => {
    const longBackstory = "A".repeat(600) // exceeds the 500 char budget
    const ctxWithLongBackstory = {
      ...baseCtx,
      characters: [
        {
          ...baseCtx.characters[0],
          backstory: longBackstory,
        },
      ],
    }
    const prompt = buildSystemPrompt(ctxWithLongBackstory)
    expect(prompt).toContain("Backstory: " + "A".repeat(500) + "...")
    expect(prompt).not.toContain("A".repeat(600))
  })

  it("truncates long character descriptions with ellipsis", () => {
    const longDescription = "B".repeat(300) // exceeds the 200 char budget
    const ctxWithLongDesc = {
      ...baseCtx,
      characters: [
        {
          ...baseCtx.characters[0],
          description: longDescription,
        },
      ],
    }
    const prompt = buildSystemPrompt(ctxWithLongDesc)
    expect(prompt).toContain("B".repeat(200) + "...")
    expect(prompt).not.toContain("B".repeat(300))
  })

  it("caps total prompt at MAX_CONTEXT_CHARS and appends truncation notice", () => {
    // MAX_CONTEXT_CHARS = 8000 * 4 = 32000
    // Create a context with many characters to blow past the limit
    const manyCharacters = Array.from({ length: 100 }, (_, i) => ({
      name: `Character${i}`,
      role: "Supporting",
      age: "30",
      archetype: "The Helper",
      description: "D".repeat(200),
      motivation: "M".repeat(200),
      fear: "F".repeat(200),
      contradiction: "C".repeat(200),
      voiceNotes: "V".repeat(200),
      traits: "T".repeat(200),
      backstory: "B".repeat(500),
    }))
    const hugeCtx = {
      ...baseCtx,
      characters: manyCharacters,
    }
    const prompt = buildSystemPrompt(hugeCtx)
    expect(prompt).toContain("[Context truncated due to length]")
    // The prompt should be capped: 32000 chars + the truncation notice
    expect(prompt.length).toBeLessThanOrEqual(32000 + "\n\n[Context truncated due to length]".length)
  })

  it("includes scene details in prompt", () => {
    const ctxWithScenes = {
      ...baseCtx,
      scenes: [
        {
          title: "The Opening",
          synopsis: "Alice enters the city",
          povCharacterName: "Alice",
          locationName: "The Library",
          moodStart: "hopeful",
          moodEnd: "anxious",
        },
      ],
    }
    const prompt = buildSystemPrompt(ctxWithScenes)
    expect(prompt).toContain("Scenes in Current Chapter")
    expect(prompt).toContain("The Opening")
    expect(prompt).toContain("Alice enters the city")
    expect(prompt).toContain("POV: Alice")
    expect(prompt).toContain("Location: The Library")
    expect(prompt).toContain("Mood: hopeful → anxious")
  })

  it("includes neighboring chapter synopses in prompt", () => {
    const ctxWithNeighbors = {
      ...baseCtx,
      neighboringSynopses: [
        { number: 1, title: "Before", synopsis: "Setup happens" },
        { number: 3, title: "After", synopsis: "Resolution happens" },
      ],
    }
    const prompt = buildSystemPrompt(ctxWithNeighbors)
    expect(prompt).toContain("Neighboring Chapters")
    expect(prompt).toContain('Chapter 1 "Before"')
    expect(prompt).toContain("Setup happens")
    expect(prompt).toContain('Chapter 3 "After"')
  })
})
