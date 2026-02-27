import { describe, it, expect } from "vitest"
import { z } from "zod"

/**
 * Zod schemas extracted from AI endpoint files.
 * We recreate them here to test validation logic without needing a running server.
 */

// From server/api/ai/style-analyze.post.ts
const styleAnalyzeSchema = z.object({
  text: z
    .string()
    .min(100, "Please provide at least 100 characters of text to analyze")
    .max(50000, "Text must not exceed 50,000 characters"),
  bookId: z.string().optional(),
})

// From server/api/ai/stream.post.ts
const streamSchema = z.object({
  bookId: z.string(),
  chapterId: z.string().optional(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ),
  command: z.string().optional(),
  selectedText: z.string().optional(),
})

// From server/api/ai/interview.post.ts
const interviewSchema = z.object({
  bookId: z.string(),
  characterId: z.string(),
  message: z.string().min(1, "message must not be empty"),
  history: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ),
})

// From server/api/ai/review.post.ts
const reviewSchema = z.object({
  chapterId: z.string(),
})

// From server/api/ai/messages/index.post.ts
const messagesPostSchema = z.object({
  bookId: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1, "content must not be empty"),
  sessionType: z.string(),
  sessionId: z.string(),
  chapterId: z.string().optional(),
  characterId: z.string().optional(),
})

describe("style-analyze schema", () => {
  it("accepts valid input", () => {
    const result = styleAnalyzeSchema.safeParse({
      text: "A".repeat(100),
      bookId: "book-123",
    })
    expect(result.success).toBe(true)
  })

  it("accepts text without bookId", () => {
    const result = styleAnalyzeSchema.safeParse({
      text: "A".repeat(200),
    })
    expect(result.success).toBe(true)
  })

  it("rejects text under 100 chars", () => {
    const result = styleAnalyzeSchema.safeParse({
      text: "Short text",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("at least 100 characters")
    }
  })

  it("rejects text over 50000 chars", () => {
    const result = styleAnalyzeSchema.safeParse({
      text: "A".repeat(50001),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("50,000 characters")
    }
  })

  it("rejects missing text field", () => {
    const result = styleAnalyzeSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it("rejects non-string text", () => {
    const result = styleAnalyzeSchema.safeParse({ text: 12345 })
    expect(result.success).toBe(false)
  })
})

describe("stream schema", () => {
  it("accepts valid input", () => {
    const result = streamSchema.safeParse({
      bookId: "book-1",
      messages: [{ role: "user", content: "Hello" }],
    })
    expect(result.success).toBe(true)
  })

  it("accepts with optional fields", () => {
    const result = streamSchema.safeParse({
      bookId: "book-1",
      chapterId: "ch-1",
      messages: [{ role: "user", content: "Hello" }],
      command: "brainstorm",
      selectedText: "some text",
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing bookId", () => {
    const result = streamSchema.safeParse({
      messages: [{ role: "user", content: "Hello" }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing messages", () => {
    const result = streamSchema.safeParse({
      bookId: "book-1",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid role in messages", () => {
    const result = streamSchema.safeParse({
      bookId: "book-1",
      messages: [{ role: "system", content: "Hello" }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects role other than user/assistant", () => {
    const result = streamSchema.safeParse({
      bookId: "book-1",
      messages: [{ role: "admin", content: "Hello" }],
    })
    expect(result.success).toBe(false)
  })

  it("accepts empty messages array", () => {
    const result = streamSchema.safeParse({
      bookId: "book-1",
      messages: [],
    })
    expect(result.success).toBe(true)
  })
})

describe("interview schema", () => {
  it("accepts valid input", () => {
    const result = interviewSchema.safeParse({
      bookId: "book-1",
      characterId: "char-1",
      message: "Tell me about yourself",
      history: [],
    })
    expect(result.success).toBe(true)
  })

  it("accepts with history", () => {
    const result = interviewSchema.safeParse({
      bookId: "book-1",
      characterId: "char-1",
      message: "What do you fear?",
      history: [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there" },
      ],
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty message", () => {
    const result = interviewSchema.safeParse({
      bookId: "book-1",
      characterId: "char-1",
      message: "",
      history: [],
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing characterId", () => {
    const result = interviewSchema.safeParse({
      bookId: "book-1",
      message: "Hello",
      history: [],
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid role in history", () => {
    const result = interviewSchema.safeParse({
      bookId: "book-1",
      characterId: "char-1",
      message: "Hello",
      history: [{ role: "system", content: "bad" }],
    })
    expect(result.success).toBe(false)
  })
})

describe("review schema", () => {
  it("accepts valid input", () => {
    const result = reviewSchema.safeParse({ chapterId: "ch-1" })
    expect(result.success).toBe(true)
  })

  it("rejects missing chapterId", () => {
    const result = reviewSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it("rejects non-string chapterId", () => {
    const result = reviewSchema.safeParse({ chapterId: 123 })
    expect(result.success).toBe(false)
  })
})

describe("messages POST schema", () => {
  it("accepts valid input", () => {
    const result = messagesPostSchema.safeParse({
      bookId: "book-1",
      role: "user",
      content: "Hello world",
      sessionType: "chat",
      sessionId: "sess-1",
    })
    expect(result.success).toBe(true)
  })

  it("accepts with optional fields", () => {
    const result = messagesPostSchema.safeParse({
      bookId: "book-1",
      role: "assistant",
      content: "Response",
      sessionType: "chat",
      sessionId: "sess-1",
      chapterId: "ch-1",
      characterId: "char-1",
    })
    expect(result.success).toBe(true)
  })

  it("rejects invalid role", () => {
    const result = messagesPostSchema.safeParse({
      bookId: "book-1",
      role: "system",
      content: "Hello",
      sessionType: "chat",
      sessionId: "sess-1",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty content", () => {
    const result = messagesPostSchema.safeParse({
      bookId: "book-1",
      role: "user",
      content: "",
      sessionType: "chat",
      sessionId: "sess-1",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing required fields", () => {
    const result = messagesPostSchema.safeParse({
      bookId: "book-1",
      role: "user",
    })
    expect(result.success).toBe(false)
  })

  it("rejects wrong types", () => {
    const result = messagesPostSchema.safeParse({
      bookId: 123,
      role: "user",
      content: "Hello",
      sessionType: "chat",
      sessionId: "sess-1",
    })
    expect(result.success).toBe(false)
  })
})
