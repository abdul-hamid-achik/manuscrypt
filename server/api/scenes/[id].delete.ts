import { scenes } from "../../database/schema"
import { defineDeleteByIdHandler } from "../../utils/crud"

export default defineDeleteByIdHandler(scenes, "Scene")
