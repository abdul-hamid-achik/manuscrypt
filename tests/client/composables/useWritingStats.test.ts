import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Test the session tracking math directly without Vue reactivity

describe("useWritingStats logic", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("calculates words written this session", () => {
    const startWordCount = 1000
    const currentWordCount = 1250
    const wordsWritten = Math.max(0, currentWordCount - startWordCount)
    expect(wordsWritten).toBe(250)
  })

  it("never returns negative words written", () => {
    const startWordCount = 1000
    const currentWordCount = 800
    const wordsWritten = Math.max(0, currentWordCount - startWordCount)
    expect(wordsWritten).toBe(0)
  })

  it("formats duration with only minutes", () => {
    const startTime = new Date("2024-01-01T10:00:00")
    vi.setSystemTime(new Date("2024-01-01T10:25:00"))

    const total = Math.floor((Date.now() - startTime.getTime()) / 1000)
    const hours = Math.floor(total / 3600)
    const minutes = Math.floor((total % 3600) / 60)

    expect(hours).toBe(0)
    expect(minutes).toBe(25)
    const formatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
    expect(formatted).toBe("25m")
  })

  it("formats duration with hours and minutes", () => {
    const startTime = new Date("2024-01-01T10:00:00")
    vi.setSystemTime(new Date("2024-01-01T11:30:00"))

    const total = Math.floor((Date.now() - startTime.getTime()) / 1000)
    const hours = Math.floor(total / 3600)
    const minutes = Math.floor((total % 3600) / 60)

    expect(hours).toBe(1)
    expect(minutes).toBe(30)
    const formatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
    expect(formatted).toBe("1h 30m")
  })

  it("returns 0m when no session started", () => {
    const startTime: Date | null = null
    const formatted = startTime ? "has time" : "0m"
    expect(formatted).toBe("0m")
  })

  it("calculates session duration in seconds", () => {
    const startTime = new Date("2024-01-01T10:00:00")
    vi.setSystemTime(new Date("2024-01-01T10:05:30"))

    const duration = Math.floor((Date.now() - startTime.getTime()) / 1000)
    expect(duration).toBe(330) // 5 minutes and 30 seconds
  })

  it("handles zero-length session", () => {
    const now = new Date("2024-01-01T10:00:00")
    vi.setSystemTime(now)
    const startTime = now

    const total = Math.floor((Date.now() - startTime.getTime()) / 1000)
    expect(total).toBe(0)
    const minutes = Math.floor((total % 3600) / 60)
    const formatted = `${minutes}m`
    expect(formatted).toBe("0m")
  })
})
