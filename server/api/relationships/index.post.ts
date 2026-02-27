import { db } from "../../database"
import { characterRelationships } from "../../database/schema"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.bookId || !body.fromCharacterId || !body.toCharacterId || !body.relationshipType) {
    throw createError({
      statusCode: 400,
      message: "bookId, fromCharacterId, toCharacterId, and relationshipType are required",
    })
  }

  const id = nanoid()

  db.insert(characterRelationships)
    .values({
      id,
      bookId: body.bookId,
      fromCharacterId: body.fromCharacterId,
      toCharacterId: body.toCharacterId,
      relationshipType: body.relationshipType,
      description: body.description ?? null,
    })
    .run()

  return db
    .select()
    .from(characterRelationships)
    .where(eq(characterRelationships.id, id))
    .get()
})
