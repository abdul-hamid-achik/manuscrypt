import { contentSnapshots } from "../../database/schema"
import { defineDeleteByIdHandler } from "../../utils/crud"

export default defineDeleteByIdHandler(contentSnapshots, "Snapshot")
