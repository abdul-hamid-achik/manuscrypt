import { characters } from "../../database/schema"
import { defineGetByIdHandler } from "../../utils/crud"

export default defineGetByIdHandler(characters, "Character")
