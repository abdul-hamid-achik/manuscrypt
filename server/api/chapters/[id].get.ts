import { chapters } from "../../database/schema"
import { defineGetByIdHandler } from "../../utils/crud"

export default defineGetByIdHandler(chapters, "Chapter")
