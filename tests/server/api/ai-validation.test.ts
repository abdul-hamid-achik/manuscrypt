import { describe, it, expect } from "vitest"
import {
  aiStyleAnalyzeSchema,
  aiStreamSchema,
  aiInterviewSchema,
  aiReviewSchema,
  aiMessageSchema,
  createRelationshipSchema,
  exportSchema,
  reorderSchema,
  createWritingSessionSchema,
} from "../../../server/utils/validation"

describe("style-analyze schema", () => {
  it("accepts valid input", () => {
    const result = aiStyleAnalyzeSchema.safeParse({
      text: "A".repeat(100),
      bookId: "book-123",
    })
    expect(result.success).toBe(true)
  })

  it("accepts text without bookId", () => {
    const result = aiStyleAnalyzeSchema.safeParse({
      text: "A".repeat(200),
    })
    expect(result.success).toBe(true)
  })

  it("rejects text under 100 chars", () => {
    const result = aiStyleAnalyzeSchema.safeParse({
      text: "Short text",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("at least 100 characters")
    }
  })

  it("rejects text over 50000 chars", () => {
    const result = aiStyleAnalyzeSchema.safeParse({
      text: "A".repeat(50001),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("50,000 characters")
    }
  })

  it("rejects missing text field", () => {
    const result = aiStyleAnalyzeSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it("rejects non-string text", () => {
    const result = aiStyleAnalyzeSchema.safeParse({ text: 12345 })
    expect(result.success).toBe(false)
  })
})

describe("stream schema", () => {
  it("accepts valid input", () => {
    const result = aiStreamSchema.safeParse({
      bookId: "book-1",
      messages: [{ role: "user", content: "Hello" }],
    })
    expect(result.success).toBe(true)
  })

  it("accepts with optional fields", () => {
    const result = aiStreamSchema.safeParse({
      bookId: "book-1",
      chapterId: "ch-1",
      messages: [{ role: "user", content: "Hello" }],
      command: "brainstorm",
      selectedText: "some text",
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing bookId", () => {
    const result = aiStreamSchema.safeParse({
      messages: [{ role: "user", content: "Hello" }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing messages", () => {
    const result = aiStreamSchema.safeParse({
      bookId: "book-1",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid role in messages", () => {
    const result = aiStreamSchema.safeParse({
      bookId: "book-1",
      messages: [{ role: "system", content: "Hello" }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects role other than user/assistant", () => {
    const result = aiStreamSchema.safeParse({
      bookId: "book-1",
      messages: [{ role: "admin", content: "Hello" }],
    })
    expect(result.success).toBe(false)
  })

  it("accepts empty messages array", () => {
    const result = aiStreamSchema.safeParse({
      bookId: "book-1",
      messages: [],
    })
    expect(result.success).toBe(true)
  })
})

describe("interview schema", () => {
  it("accepts valid input", () => {
    const result = aiInterviewSchema.safeParse({
      bookId: "book-1",
      characterId: "char-1",
      message: "Tell me about yourself",
      history: [],
    })
    expect(result.success).toBe(true)
  })

  it("accepts with history", () => {
    const result = aiInterviewSchema.safeParse({
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
    const result = aiInterviewSchema.safeParse({
      bookId: "book-1",
      characterId: "char-1",
      message: "",
      history: [],
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing characterId", () => {
    const result = aiInterviewSchema.safeParse({
      bookId: "book-1",
      message: "Hello",
      history: [],
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid role in history", () => {
    const result = aiInterviewSchema.safeParse({
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
    const result = aiReviewSchema.safeParse({ chapterId: "ch-1" })
    expect(result.success).toBe(true)
  })

  it("rejects missing chapterId", () => {
    const result = aiReviewSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it("rejects non-string chapterId", () => {
    const result = aiReviewSchema.safeParse({ chapterId: 123 })
    expect(result.success).toBe(false)
  })
})

describe("messages POST schema", () => {
  it("accepts valid input", () => {
    const result = aiMessageSchema.safeParse({
      bookId: "book-1",
      role: "user",
      content: "Hello world",
      command: "chat",
    })
    expect(result.success).toBe(true)
  })

  it("accepts with optional fields", () => {
    const result = aiMessageSchema.safeParse({
      bookId: "book-1",
      role: "assistant",
      content: "Response",
      chapterId: "ch-1",
      characterId: "char-1",
    })
    expect(result.success).toBe(true)
  })

  it("rejects invalid role", () => {
    const result = aiMessageSchema.safeParse({
      bookId: "book-1",
      role: "system",
      content: "Hello",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty content", () => {
    const result = aiMessageSchema.safeParse({
      bookId: "book-1",
      role: "user",
      content: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing required fields", () => {
    const result = aiMessageSchema.safeParse({
      bookId: "book-1",
      role: "user",
    })
    expect(result.success).toBe(false)
  })

  it("rejects wrong types", () => {
    const result = aiMessageSchema.safeParse({
      bookId: 123,
      role: "user",
      content: "Hello",
    })
    expect(result.success).toBe(false)
  })
})

describe("createRelationshipSchema", () => {
  it("accepts valid relationship", () => {
    const result = createRelationshipSchema.safeParse({
      bookId: "book-1",
      fromCharacterId: "char-1",
      toCharacterId: "char-2",
      relationshipType: "sibling",
    })
    expect(result.success).toBe(true)
  })

  it("accepts with optional description", () => {
    const result = createRelationshipSchema.safeParse({
      bookId: "book-1",
      fromCharacterId: "char-1",
      toCharacterId: "char-2",
      relationshipType: "rival",
      description: "They compete for the throne",
    })
    expect(result.success).toBe(true)
  })

  it("rejects self-relationship (fromCharacterId === toCharacterId)", () => {
    const result = createRelationshipSchema.safeParse({
      bookId: "book-1",
      fromCharacterId: "char-1",
      toCharacterId: "char-1",
      relationshipType: "friend",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("cannot have a relationship with itself")
    }
  })

  it("rejects missing required fields", () => {
    const result = createRelationshipSchema.safeParse({
      bookId: "book-1",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty relationshipType", () => {
    const result = createRelationshipSchema.safeParse({
      bookId: "book-1",
      fromCharacterId: "char-1",
      toCharacterId: "char-2",
      relationshipType: "",
    })
    expect(result.success).toBe(false)
  })
})

describe("exportSchema", () => {
  it("accepts valid bookId", () => {
    const result = exportSchema.safeParse({ bookId: "book-123" })
    expect(result.success).toBe(true)
  })

  it("rejects empty bookId", () => {
    const result = exportSchema.safeParse({ bookId: "" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("bookId is required")
    }
  })

  it("rejects missing bookId", () => {
    const result = exportSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it("rejects non-string bookId", () => {
    const result = exportSchema.safeParse({ bookId: 42 })
    expect(result.success).toBe(false)
  })
})

describe("reorderSchema", () => {
  it("accepts valid non-negative integer", () => {
    const result = reorderSchema.safeParse({ newOrder: 3 })
    expect(result.success).toBe(true)
  })

  it("accepts zero", () => {
    const result = reorderSchema.safeParse({ newOrder: 0 })
    expect(result.success).toBe(true)
  })

  it("rejects negative number", () => {
    const result = reorderSchema.safeParse({ newOrder: -1 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("newOrder must be >= 0")
    }
  })

  it("rejects non-integer", () => {
    const result = reorderSchema.safeParse({ newOrder: 1.5 })
    expect(result.success).toBe(false)
  })

  it("rejects string", () => {
    const result = reorderSchema.safeParse({ newOrder: "abc" })
    expect(result.success).toBe(false)
  })

  it("rejects missing newOrder", () => {
    const result = reorderSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe("createWritingSessionSchema", () => {
  it("accepts valid input with all fields", () => {
    const result = createWritingSessionSchema.safeParse({
      bookId: "book-1",
      chapterId: "ch-1",
      wordsWritten: 500,
      duration: 3600,
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
    })
    expect(result.success).toBe(true)
  })

  it("accepts with only bookId", () => {
    const result = createWritingSessionSchema.safeParse({
      bookId: "book-1",
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing bookId", () => {
    const result = createWritingSessionSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it("rejects empty bookId", () => {
    const result = createWritingSessionSchema.safeParse({ bookId: "" })
    expect(result.success).toBe(false)
  })

  it("rejects negative wordsWritten", () => {
    const result = createWritingSessionSchema.safeParse({
      bookId: "book-1",
      wordsWritten: -10,
    })
    expect(result.success).toBe(false)
  })

  it("rejects non-integer duration", () => {
    const result = createWritingSessionSchema.safeParse({
      bookId: "book-1",
      duration: 3.5,
    })
    expect(result.success).toBe(false)
  })
})
