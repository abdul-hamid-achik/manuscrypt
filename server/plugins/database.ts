import { sqlite } from "../database"

export default defineNitroPlugin(() => {
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
      chapter_id TEXT,
      character_id TEXT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      command TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

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
  // Migrations for existing databases
  try {
    sqlite.exec(`ALTER TABLE ai_messages ADD COLUMN character_id TEXT`)
  } catch {
    // Column already exists
  }

  console.log("[database] Tables verified/created")
})
