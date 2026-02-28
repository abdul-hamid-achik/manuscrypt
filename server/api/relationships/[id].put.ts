import { db } from "../../database"
import { characterRelationships } from "../../database/schema"
import { eq } from "drizzle-orm"
import { updateRelationshipSchema, parseBody } from "../../utils/validation"

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id")
  const body = await readBody(event)
  const data = parseBody(updateRelationshipSchema, body)

  const existing = db
    .select()
    .from(characterRelationships)
    .where(eq(characterRelationships.id, id!))
    .get()
  if (!existing) {
    throw createError({ statusCode: 404, message: "Relationship not found" })
  }

  db.update(characterRelationships)
    .set({
      ...(data.relationshipType !== undefined && { relationshipType: data.relationshipType }),
      ...(data.description !== undefined && { description: data.description }),
    })
    .where(eq(characterRelationships.id, id!))
    .run()

  return db
    .select()
    .from(characterRelationships)
    .where(eq(characterRelationships.id, id!))
    .get()
})
