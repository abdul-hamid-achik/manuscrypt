import { db } from "../../database"
import { books } from "../../database/schema"

export default defineEventHandler(async () => {
  return db.select().from(books).all()
})
