import { locations } from "../../database/schema"
import { defineGetByIdHandler } from "../../utils/crud"

export default defineGetByIdHandler(locations, "Location")
