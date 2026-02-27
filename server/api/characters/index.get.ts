import { characters } from "../../database/schema"
import { defineListByParentHandler } from "../../utils/crud"

export default defineListByParentHandler(characters, characters.bookId, "bookId")
