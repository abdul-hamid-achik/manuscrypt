import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { mkdirSync } from "fs"
import { dirname } from "path"
import * as schema from "./schema"

const dbPath = "./data/manuscrypt.db"
mkdirSync(dirname(dbPath), { recursive: true })

const sqlite = new Database(dbPath)
sqlite.pragma("journal_mode = WAL")
sqlite.pragma("foreign_keys = ON")

export const db = drizzle(sqlite, { schema })
export { sqlite }
export type DrizzleDB = typeof db
