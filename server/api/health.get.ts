import { db } from "../database"
import { books } from "../database/schema"
import { sql } from "drizzle-orm"

export default defineEventHandler(async () => {
  try {
    // Verify DB is connected
    db.select({ count: sql<number>`count(*)` }).from(books).get()
    return { status: "ok", timestamp: new Date().toISOString() }
  } catch (e) {
    throw createError({
      statusCode: 503,
      message: "Database unavailable",
    })
  }
})
