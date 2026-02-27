import { books } from "../../database/schema"
import { defineDeleteByIdHandler } from "../../utils/crud"

export default defineDeleteByIdHandler(books, "Book")
