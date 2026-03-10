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
    mockGetRequestHeader.mockImplementation((_event: unknown, header: string) => {
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
    mockGetRequestHeader.mockImplementation((_event: unknown, header: string) => {
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

describe("setInterval cleanup", () => {
  // The module must be imported AFTER fake timers are active so setInterval uses fake timers.
  // We use vi.useFakeTimers() + vi.resetModules() + dynamic import to achieve this.

  it("cleans up old entries after the cleanup interval fires", async () => {
    vi.useFakeTimers()
    vi.resetModules()

    // Re-stub globals for the fresh module import
    vi.stubGlobal("getRequestHeader", vi.fn())
    vi.stubGlobal("createError", mockCreateError)

    const { checkRateLimit: rl } = await import("../../../server/utils/rate-limit")
    const event = createMockEvent("10.0.0.200")

    // Fill up the rate limit with a large window so checkRateLimit won't filter them out
    for (let i = 0; i < 3; i++) {
      rl(event, { maxRequests: 3, windowMs: 600_000 })
    }

    // Should be rate-limited now (window is 600s, all timestamps within it)
    expect(() => rl(event, { maxRequests: 3, windowMs: 600_000 })).toThrow()

    // Advance 300s to trigger cleanup. Timestamps are 300s old (>120s) → cleaned.
    vi.advanceTimersByTime(300_000)

    // After cleanup, entries removed → requests allowed again
    expect(() => rl(event, { maxRequests: 3, windowMs: 600_000 })).not.toThrow()

    vi.useRealTimers()
  })

  it("partially cleans entries — keeps recent, removes old", async () => {
    vi.useFakeTimers()
    vi.resetModules()

    vi.stubGlobal("getRequestHeader", vi.fn())
    vi.stubGlobal("createError", mockCreateError)

    const { checkRateLimit: rl } = await import("../../../server/utils/rate-limit")
    const event = createMockEvent("10.0.0.201")

    // Add 2 requests at t=0
    rl(event, { maxRequests: 5, windowMs: 600_000 })
    rl(event, { maxRequests: 5, windowMs: 600_000 })

    // Advance to t=250s — add 1 more request
    vi.advanceTimersByTime(250_000)
    rl(event, { maxRequests: 5, windowMs: 600_000 })

    // Advance 50s more to trigger cleanup at t=300s
    vi.advanceTimersByTime(50_000)

    // Cleanup: requests at t=0 are 300s old (>120s) → removed.
    // Request at t=250s is 50s old (<120s) → kept.
    // With windowMs=600_000, the surviving request is within the window.
    // 5 max - 1 remaining = 4 more allowed
    for (let i = 0; i < 4; i++) {
      expect(() => rl(event, { maxRequests: 5, windowMs: 600_000 })).not.toThrow()
    }
    expect(() => rl(event, { maxRequests: 5, windowMs: 600_000 })).toThrow()

    vi.useRealTimers()
  })

  it("deletes map entry entirely when all timestamps are old", async () => {
    vi.useFakeTimers()
    vi.resetModules()

    vi.stubGlobal("getRequestHeader", vi.fn())
    vi.stubGlobal("createError", mockCreateError)

    const { checkRateLimit: rl } = await import("../../../server/utils/rate-limit")
    const event = createMockEvent("10.0.0.202")

    // Add a request at t=0
    rl(event, { maxRequests: 3, windowMs: 600_000 })

    // Advance 300s to trigger cleanup — timestamp at t=0 is 300s old (>120s) → deleted
    vi.advanceTimersByTime(300_000)

    // Slate is clean — all 3 requests should work
    for (let i = 0; i < 3; i++) {
      expect(() => rl(event, { maxRequests: 3, windowMs: 600_000 })).not.toThrow()
    }

    vi.useRealTimers()
  })
})
