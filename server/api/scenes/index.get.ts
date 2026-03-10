import { db } from "../../database"
import { scenes } from "../../database/schema"
import { asc, inArray } from "drizzle-orm"

function parseChapterIds(input: string | string[] | undefined): string[] {
  if (!input) return []

  const raw = Array.isArray(input) ? input.join(",") : input
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter((id): id is string => id.length > 0)
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const chapterId = query.chapterId as string | undefined
  const chapterIds = parseChapterIds(query.chapterIds as string | string[] | undefined)

  const filteredIds = [...new Set(chapterIds)]
  const requestedIds = chapterId ? [...new Set([chapterId, ...filteredIds])] : filteredIds

  if (requestedIds.length > 0) {
    return db
      .select()
      .from(scenes)
      .where(inArray(scenes.chapterId, requestedIds))
      .orderBy(asc(scenes.chapterId), asc(scenes.sortOrder))
      .all()
  }

  throw createError({ statusCode: 400, message: "chapterId or chapterIds query param is required" })
})
