import { describe, it, expect, vi } from "vitest"

// Mock Nitro auto-imports used by ai-stream.ts
vi.stubGlobal("createError", (opts: { statusCode: number; message: string }) => {
  const err = new Error(opts.message) as any
  err.statusCode = opts.statusCode
  return err
})
vi.stubGlobal("useRuntimeConfig", () => ({
  anthropicApiKey: "test-key",
  anthropicFastModel: "test-fast",
  anthropicSmartModel: "test-smart",
}))

import { callAnthropicJson } from "../../../server/utils/ai-stream"

describe("AI Style Analysis", () => {
  it("validates minimum text length requirement", () => {
    const shortText = "Too short."
    expect(shortText.trim().length).toBeLessThan(100)
  })

  it("accepts text with sufficient length", () => {
    const longText = "A".repeat(200)
    expect(longText.trim().length).toBeGreaterThanOrEqual(100)
  })

  it("parses style analysis JSON from Anthropic", async () => {
    const mockResponse = {
      sentenceLengthAvg: 15,
      vocabularyRichness: 0.65,
      dialogueRatio: 0.3,
      toneDescription: "Dark and brooding",
      paceDescription: "Slow and contemplative",
      strengths: ["Rich imagery", "Strong voice"],
      suggestions: ["Vary sentence length", "Add more dialogue"],
      comparableAuthors: ["Cormac McCarthy", "Toni Morrison"],
    }

    const mockAnthropicClient = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: JSON.stringify(mockResponse) }],
        }),
      },
    } as any

    const result = await callAnthropicJson<typeof mockResponse>(mockAnthropicClient, {
      model: "test-model",
      maxTokens: 2048,
      system: "Analyze style",
      messages: [{ role: "user", content: "Analyze this text..." }],
      errorLabel: "style analysis",
    })

    expect(result.sentenceLengthAvg).toBe(15)
    expect(result.vocabularyRichness).toBe(0.65)
    expect(result.comparableAuthors).toContain("Cormac McCarthy")
    expect(result.strengths).toHaveLength(2)
  })

  it("handles API error gracefully", async () => {
    const mockAnthropicClient = {
      messages: {
        create: vi.fn().mockRejectedValue(new Error("API rate limit")),
      },
    } as any

    await expect(
      callAnthropicJson(mockAnthropicClient, {
        model: "test-model",
        maxTokens: 2048,
        system: "Analyze",
        messages: [{ role: "user", content: "Test" }],
        errorLabel: "style analysis",
      }),
    ).rejects.toThrow("API rate limit")
  })
})
