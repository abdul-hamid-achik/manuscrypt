import { characterRelationships } from "../../database/schema"
import { defineDeleteByIdHandler } from "../../utils/crud"

export default defineDeleteByIdHandler(characterRelationships, "Relationship")
