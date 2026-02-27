import { describe, it, expect, vi, beforeEach } from "vitest"
import type { H3Event } from "h3"

// The source file uses Nuxt auto-imports (getRequestHeader, createError)
// which are global in the Nuxt runtime. We need to stub them globally.
const mockGetRequestHeader = vi.fn()
const mockCreateError = vi.fn((opts: { statusCode: number; message: string }) => {
  const err = new Error(opts.message) as Error & { statusCode: number }
  err.statusCode = opts.statusCode
  return err
})

vi.stubGlobal("getRequestHeader", mockGetRequestHeader)
vi.stubGlobal("createError", mockCreateError)

const { checkRateLimit } = await import("../../../server/utils/rate-limit")

function createMockEvent(ip: string = "127.0.0.1"): H3Event {
  return {
    node: {
      req: {
        socket: { remoteAddress: ip },
      },
    },
  } as unknown as H3Event
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetRequestHeader.mockReturnValue(undefined)
})

describe("checkRateLimit", () => {
  it("allows requests under the limit", () => {
    const event = createMockEvent("10.0.0.1")
    expect(() => checkRateLimit(event, { maxRequests: 5, windowMs: 60_000 })).not.toThrow()
  })

  it("allows multiple requests under the limit", () => {
    const event = createMockEvent("10.0.0.2")
    for (let i = 0; i < 4; i++) {
      expect(() => checkRateLimit(event, { maxRequests: 5, windowMs: 60_000 })).not.toThrow()
    }
  })

  it("throws 429 when limit is exceeded", () => {
    const event = createMockEvent("10.0.0.3")
    for (let i = 0; i < 3; i++) {
      checkRateLimit(event, { maxRequests: 3, windowMs: 60_000 })
    }
    expect(() => checkRateLimit(event, { maxRequests: 3, windowMs: 60_000 })).toThrow()
    expect(mockCreateError).toHaveBeenCalledWith({
      statusCode: 429,
      message: "Too many requests. Please try again later.",
    })
  })

  it("does not count requests outside the window", () => {
    const event = createMockEvent("10.0.0.4")
    const realDateNow = Date.now

    const baseTime = 1000000
    Date.now = vi.fn(() => baseTime)
    checkRateLimit(event, { maxRequests: 2, windowMs: 1000 })
    checkRateLimit(event, { maxRequests: 2, windowMs: 1000 })

    // Window is full — this should throw
    expect(() => checkRateLimit(event, { maxRequests: 2, windowMs: 1000 })).toThrow()

    // Move time past the window
    Date.now = vi.fn(() => baseTime + 2000)

    // Should now succeed since old requests are outside the window
    expect(() => checkRateLimit(event, { maxRequests: 2, windowMs: 1000 })).not.toThrow()

    Date.now = realDateNow
  })

  it("reads IP from x-forwarded-for header", () => {
    mockGetRequestHeader.mockImplementation((_event: any, header: string) => {
      if (header === "x-forwarded-for") return "203.0.113.1, 10.0.0.1"
      return undefined
    })

    const event = createMockEvent("10.0.0.5")
    for (let i = 0; i < 2; i++) {
      checkRateLimit(event, { maxRequests: 2, windowMs: 60_000 })
    }
    expect(() => checkRateLimit(event, { maxRequests: 2, windowMs: 60_000 })).toThrow()
  })

  it("reads IP from x-real-ip header when x-forwarded-for is absent", () => {
    mockGetRequestHeader.mockImplementation((_event: any, header: string) => {
      if (header === "x-real-ip") return "203.0.113.2"
      return undefined
    })

    const event = createMockEvent("10.0.0.6")
    for (let i = 0; i < 2; i++) {
      checkRateLimit(event, { maxRequests: 2, windowMs: 60_000 })
    }
    expect(() => checkRateLimit(event, { maxRequests: 2, windowMs: 60_000 })).toThrow()
  })

  it("uses default maxRequests and windowMs when not provided", () => {
    const event = createMockEvent("10.0.0.7")
    // Default is maxRequests: 20 — should not throw for a few calls
    for (let i = 0; i < 5; i++) {
      expect(() => checkRateLimit(event)).not.toThrow()
    }
  })
})
