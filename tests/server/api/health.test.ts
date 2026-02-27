import { describe, it, expect, vi, beforeEach } from "vitest"
import { createTestDb } from "../../setup/test-db"

const { db, sqlite } = createTestDb()

vi.mock("../../../server/database", () => ({ db }))

// Mock Nuxt auto-imports
vi.mock("h3", async () => {
  const actual = await vi.importActual<typeof import("h3")>("h3")
  return {
    ...actual,
    defineEventHandler: (handler: Function) => handler,
    createError: vi.fn((opts: { statusCode: number; message: string }) => {
      const err = new Error(opts.message) as Error & { statusCode: number }
      err.statusCode = opts.statusCode
      return err
    }),
  }
})

// Need to provide defineEventHandler globally for the import
vi.stubGlobal("defineEventHandler", (handler: Function) => handler)
vi.stubGlobal("createError", (opts: { statusCode: number; message: string }) => {
  const err = new Error(opts.message) as Error & { statusCode: number }
  err.statusCode = opts.statusCode
  return err
})

const handler = (await import("../../../server/api/health.get")).default

describe("GET /api/health", () => {
  it("returns ok status and a timestamp when DB is available", async () => {
    const result = await handler()
    expect(result).toHaveProperty("status", "ok")
    expect(result).toHaveProperty("timestamp")
    // Verify timestamp is a valid ISO string
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp)
  })

  it("throws 503 when DB is unavailable", async () => {
    // Close the DB to simulate unavailability
    const origGet = db.select
    // @ts-expect-error - mocking internal
    db.select = () => ({
      from: () => ({
        get: () => {
          throw new Error("DB is closed")
        },
      }),
    })

    await expect(handler()).rejects.toThrow("Database unavailable")

    // Restore
    db.select = origGet
  })
})
