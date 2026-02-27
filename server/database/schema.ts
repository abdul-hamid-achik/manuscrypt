import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"

export const books = sqliteTable("books", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  genre: text("genre"),
  premise: text("premise"),
  targetWordCount: integer("target_word_count").default(80000),
  status: text("status").default("planning"),
  styleGuide: text("style_guide"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
})

export const chapters = sqliteTable("chapters", {
  id: text("id").primaryKey(),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  title: text("title").notNull(),
  synopsis: text("synopsis"),
  content: text("content"),
  wordCount: integer("word_count").default(0),
  status: text("status").default("planned"),
  act: integer("act"),
  sortOrder: integer("sort_order").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
})

export const scenes = sqliteTable("scenes", {
  id: text("id").primaryKey(),
  chapterId: text("chapter_id")
    .notNull()
    .references(() => chapters.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  synopsis: text("synopsis"),
  povCharacterId: text("pov_character_id"),
  locationId: text("location_id"),
  moodStart: text("mood_start"),
  moodEnd: text("mood_end"),
  targetWordCount: integer("target_word_count"),
  status: text("status").default("planned"),
  sortOrder: integer("sort_order").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
})

export const characters = sqliteTable("characters", {
  id: text("id").primaryKey(),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role"),
  age: text("age"),
  archetype: text("archetype"),
  description: text("description"),
  motivation: text("motivation"),
  fear: text("fear"),
  contradiction: text("contradiction"),
  voiceNotes: text("voice_notes"),
  traits: text("traits"),
  backstory: text("backstory"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
})

export const characterRelationships = sqliteTable("character_relationships", {
  id: text("id").primaryKey(),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  fromCharacterId: text("from_character_id")
    .notNull()
    .references(() => characters.id, { onDelete: "cascade" }),
  toCharacterId: text("to_character_id")
    .notNull()
    .references(() => characters.id, { onDelete: "cascade" }),
  relationshipType: text("relationship_type").notNull(),
  description: text("description"),
})

export const locations = sqliteTable("locations", {
  id: text("id").primaryKey(),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  sensoryDetails: text("sensory_details"),
  emotionalTone: text("emotional_tone"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
})

export const aiMessages = sqliteTable("ai_messages", {
  id: text("id").primaryKey(),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  chapterId: text("chapter_id"),
  characterId: text("character_id"),
  role: text("role").notNull(),
  content: text("content").notNull(),
  command: text("command"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
})

export const writingSessions = sqliteTable("writing_sessions", {
  id: text("id").primaryKey(),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  chapterId: text("chapter_id"),
  wordsWritten: integer("words_written").default(0),
  duration: integer("duration"),
  startedAt: text("started_at").default(sql`(datetime('now'))`),
  endedAt: text("ended_at"),
})
