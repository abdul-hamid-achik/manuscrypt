import { db } from "../../database"
import { chapters, contentSnapshots } from "../../database/schema"
import { eq, desc, asc, count } from "drizzle-orm"
import { updateChapterSchema, parseBody } from "../../utils/validation"

const SNAPSHOT_THROTTLE_MS = 10 * 60 * 1000 // 10 minutes
const MAX_SNAPSHOTS_PER_CHAPTER = 100

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")
  const body = await readBody(event)
  const data = parseBody(updateChapterSchema, body)

  const existing = db.select().from(chapters).where(eq(chapters.id, id!)).get()
  if (!existing) {
    throw createError({ statusCode: 404, message: "Chapter not found" })
  }

  // Auto-snapshot old content when content changes
  if (data.content !== undefined && existing.content) {
    const shouldSnapshot = await checkSnapshotThrottle(id!)
    if (shouldSnapshot) {
      // Count words in old content
      const oldWordCount = existing.wordCount ?? 0

      db.insert(contentSnapshots)
        .values({
          chapterId: id!,
          content: existing.content,
          wordCount: oldWordCount,
        })
        .run()

      // Cap snapshots at MAX_SNAPSHOTS_PER_CHAPTER
      await capSnapshots(id!)
    }
  }

  db.update(chapters)
    .set({
      ...(data.title !== undefined && { title: data.title }),
      ...(data.synopsis !== undefined && { synopsis: data.synopsis }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.wordCount !== undefined && { wordCount: data.wordCount }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.act !== undefined && { act: data.act }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(chapters.id, id!))
    .run()

  return db.select().from(chapters).where(eq(chapters.id, id!)).get()
})

async function checkSnapshotThrottle(chapterId: string): Promise<boolean> {
  const lastSnapshot = db
    .select()
    .from(contentSnapshots)
    .where(eq(contentSnapshots.chapterId, chapterId))
    .orderBy(desc(contentSnapshots.createdAt))
    .limit(1)
    .get()

  if (!lastSnapshot) return true

  const lastTime = new Date(lastSnapshot.createdAt).getTime()
  return Date.now() - lastTime >= SNAPSHOT_THROTTLE_MS
}

async function capSnapshots(chapterId: string): Promise<void> {
  const total = db
    .select({ count: count() })
    .from(contentSnapshots)
    .where(eq(contentSnapshots.chapterId, chapterId))
    .get()

  if (!total || total.count <= MAX_SNAPSHOTS_PER_CHAPTER) return

  // Find the oldest snapshots to delete
  const toDelete = total.count - MAX_SNAPSHOTS_PER_CHAPTER
  const oldest = db
    .select({ id: contentSnapshots.id })
    .from(contentSnapshots)
    .where(eq(contentSnapshots.chapterId, chapterId))
    .orderBy(asc(contentSnapshots.createdAt))
    .limit(toDelete)
    .all()

  for (const row of oldest) {
    db.delete(contentSnapshots).where(eq(contentSnapshots.id, row.id)).run()
  }
}
