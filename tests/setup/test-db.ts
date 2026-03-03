import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import * as schema from "../../server/database/schema"

export function createTestDb() {
  const sqlite = new Database(":memory:")
  sqlite.pragma("journal_mode = WAL")
  sqlite.pragma("foreign_keys = ON")

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      genre TEXT,
      premise TEXT,
      target_word_count INTEGER DEFAULT 80000,
      status TEXT DEFAULT 'planning',
      style_guide TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      number INTEGER NOT NULL,
      title TEXT NOT NULL,
      synopsis TEXT,
      content TEXT,
      word_count INTEGER DEFAULT 0,
      target_word_count INTEGER,
      status TEXT DEFAULT 'planned',
      act INTEGER,
      sort_order INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scenes (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      synopsis TEXT,
      pov_character_id TEXT,
      location_id TEXT,
      mood_start TEXT,
      mood_end TEXT,
      target_word_count INTEGER,
      status TEXT DEFAULT 'planned',
      sort_order INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT,
      age TEXT,
      archetype TEXT,
      description TEXT,
      motivation TEXT,
      fear TEXT,
      contradiction TEXT,
      voice_notes TEXT,
      traits TEXT,
      backstory TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS character_relationships (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      from_character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      to_character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      relationship_type TEXT NOT NULL,
      description TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_relationships_unique
      ON character_relationships(from_character_id, to_character_id, book_id);

    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      sensory_details TEXT,
      emotional_tone TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ai_messages (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
      character_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      command TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS content_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      word_count INTEGER NOT NULL DEFAULT 0,
      label TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_snapshots_chapter ON content_snapshots(chapter_id);
    CREATE INDEX IF NOT EXISTS idx_snapshots_chapter_date ON content_snapshots(chapter_id, created_at);

    CREATE TABLE IF NOT EXISTS writing_sessions (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      chapter_id TEXT,
      words_written INTEGER DEFAULT 0,
      duration INTEGER,
      started_at TEXT DEFAULT (datetime('now')),
      ended_at TEXT
    );
  `)

  const db = drizzle(sqlite, { schema })
  return { db, sqlite }
}
