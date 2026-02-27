import { chapters } from "../../database/schema"
import { defineListByParentHandler } from "../../utils/crud"

export default defineListByParentHandler(chapters, chapters.bookId, "bookId", chapters.sortOrder)
