import { locations } from "../../database/schema"
import { defineListByParentHandler } from "../../utils/crud"

export default defineListByParentHandler(locations, locations.bookId, "bookId")
