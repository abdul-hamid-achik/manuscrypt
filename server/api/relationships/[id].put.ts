import { db } from "../../database"
import { characterRelationships } from "../../database/schema"
import { eq } from "drizzle-orm"

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")
  const body = await readBody(event)

  const existing = db
    .select()
    .from(characterRelationships)
    .where(eq(characterRelationships.id, id!))
    .get()
  if (!existing) {
    throw createError({ statusCode: 404, message: "Relationship not found" })
  }

  const { relationshipType, description } = body
  db.update(characterRelationships)
    .set({
      ...(relationshipType !== undefined && { relationshipType }),
      ...(description !== undefined && { description }),
    })
    .where(eq(characterRelationships.id, id!))
    .run()

  return db
    .select()
    .from(characterRelationships)
    .where(eq(characterRelationships.id, id!))
    .get()
})
