import { db } from "../../database"
import { characterRelationships } from "../../database/schema"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { createRelationshipSchema, parseBody } from "../../utils/validation"

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = parseBody(createRelationshipSchema, body)

  const id = nanoid()

  db.insert(characterRelationships)
    .values({
      id,
      bookId: data.bookId,
      fromCharacterId: data.fromCharacterId,
      toCharacterId: data.toCharacterId,
      relationshipType: data.relationshipType,
      description: data.description ?? null,
    })
    .run()

  return db
    .select()
    .from(characterRelationships)
    .where(eq(characterRelationships.id, id))
    .get()
})
