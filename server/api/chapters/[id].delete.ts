import { chapters } from "../../database/schema"
import { defineDeleteByIdHandler } from "../../utils/crud"

export default defineDeleteByIdHandler(chapters, "Chapter")
