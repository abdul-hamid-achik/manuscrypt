import { db } from "../database"
import { eq, asc } from "drizzle-orm"
import type { SQLiteTableWithColumns } from "drizzle-orm/sqlite-core"
import type { SQLiteColumn } from "drizzle-orm/sqlite-core"

export function defineGetByIdHandler<T extends SQLiteTableWithColumns<any>>(
  table: T,
  entityName: string,
) {
  return defineEventHandler(async (event) => {
    const id = getRouterParam(event, "id")

    const record = db.select().from(table).where(eq(table.id, id!)).get()
    if (!record) {
      throw createError({ statusCode: 404, message: `${entityName} not found` })
    }

    return record
  })
}

export function defineDeleteByIdHandler<T extends SQLiteTableWithColumns<any>>(
  table: T,
  entityName: string,
) {
  return defineEventHandler(async (event) => {
    const id = getRouterParam(event, "id")

    const existing = db.select().from(table).where(eq(table.id, id!)).get()
    if (!existing) {
      throw createError({ statusCode: 404, message: `${entityName} not found` })
    }

    db.delete(table).where(eq(table.id, id!)).run()

    return { success: true }
  })
}

export function defineListByParentHandler<T extends SQLiteTableWithColumns<any>>(
  table: T,
  parentCol: SQLiteColumn,
  paramName: string,
  orderCol?: SQLiteColumn,
) {
  return defineEventHandler(async (event) => {
    const query = getQuery(event)
    const parentId = query[paramName] as string | undefined

    if (!parentId) {
      throw createError({ statusCode: 400, message: `${paramName} query param is required` })
    }

    const q = db.select().from(table).where(eq(parentCol, parentId))

    if (orderCol) {
      return q.orderBy(asc(orderCol)).all()
    }

    return q.all()
  })
}
