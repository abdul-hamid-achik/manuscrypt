import { locations } from "../../database/schema"
import { defineDeleteByIdHandler } from "../../utils/crud"

export default defineDeleteByIdHandler(locations, "Location")
