import { characterRelationships } from "../../database/schema"
import { defineListByParentHandler } from "../../utils/crud"

export default defineListByParentHandler(characterRelationships, characterRelationships.bookId, "bookId")
