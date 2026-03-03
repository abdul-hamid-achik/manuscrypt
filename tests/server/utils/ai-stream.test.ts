import { describe, it, expect, vi } from "vitest"

import {
  createAnthropicClient,
  streamAnthropicResponse,
  callAnthropicJson,
} from "../../../server/utils/ai-stream"

// Mock Nitro auto-imports
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

// Default createEventStream mock (overridden per-test for streamAnthropicResponse)
vi.stubGlobal("createEventStream", () => ({
  push: vi.fn(async () => {}),
  close: vi.fn(async () => {}),
  send: vi.fn(() => "sent"),
}))

// ─── createAnthropicClient ─────────────────────────────────────────────

describe("createAnthropicClient", () => {
  it("returns an Anthropic client when API key is configured", () => {
    const client = createAnthropicClient()
    expect(client).toBeDefined()
    expect(client.messages).toBeDefined()
  })

  it("throws 500 error when ANTHROPIC_API_KEY is missing", () => {
    vi.stubGlobal("useRuntimeConfig", () => ({
      anthropicApiKey: "",
      anthropicFastModel: "test-fast",
      anthropicSmartModel: "test-smart",
    }))

    try {
      expect(() => createAnthropicClient()).toThrow("ANTHROPIC_API_KEY not configured")

      // Also verify statusCode
      try {
        createAnthropicClient()
      } catch (err: any) {
        expect(err.statusCode).toBe(500)
      }
    } finally {
      // Restore default
      vi.stubGlobal("useRuntimeConfig", () => ({
        anthropicApiKey: "test-key",
        anthropicFastModel: "test-fast",
        anthropicSmartModel: "test-smart",
      }))
    }
  })
})

// ─── streamAnthropicResponse ────────────────────────────────────────────

describe("streamAnthropicResponse", () => {
  const baseOpts = {
    model: "test-model",
    maxTokens: 1024,
    system: "You are a helper",
    messages: [{ role: "user" as const, content: "Hello" }],
  }

  function setupMockEventStream() {
    const pushes: string[] = []
    const mockEventStream = {
      push: vi.fn(async (data: string) => {
        pushes.push(data)
      }),
      close: vi.fn(async () => {}),
      send: vi.fn(() => "sent"),
    }
    vi.stubGlobal("createEventStream", () => mockEventStream)
    return { pushes, mockEventStream }
  }

  it("pushes text delta events correctly", async () => {
    const { pushes, mockEventStream } = setupMockEventStream()

    async function* mockStream() {
      yield { type: "content_block_delta", delta: { type: "text_delta", text: "Hello" } }
      yield { type: "content_block_delta", delta: { type: "text_delta", text: " world" } }
    }

    const mockAnthropicClient = {
      messages: {
        stream: vi.fn(() => mockStream()),
      },
    } as any

    const result = streamAnthropicResponse({} as any, mockAnthropicClient, baseOpts)
    expect(result).toBe("sent")

    // Wait for the async run() to finish
    await vi.waitFor(() => {
      expect(mockEventStream.close).toHaveBeenCalled()
    })

    expect(pushes).toContain(JSON.stringify({ type: "text", content: "Hello" }))
    expect(pushes).toContain(JSON.stringify({ type: "text", content: " world" }))
  })

  it("pushes done event at the end", async () => {
    const { pushes, mockEventStream } = setupMockEventStream()

    async function* mockStream() {
      yield { type: "content_block_delta", delta: { type: "text_delta", text: "Hi" } }
    }

    const mockAnthropicClient = {
      messages: { stream: vi.fn(() => mockStream()) },
    } as any

    streamAnthropicResponse({} as any, mockAnthropicClient, baseOpts)

    await vi.waitFor(() => {
      expect(mockEventStream.close).toHaveBeenCalled()
    })

    const lastPush = pushes[pushes.length - 1]
    expect(JSON.parse(lastPush)).toEqual({ type: "done" })
  })

  it("skips non-text-delta events", async () => {
    const { pushes, mockEventStream } = setupMockEventStream()

    async function* mockStream() {
      yield { type: "message_start", message: {} }
      yield { type: "content_block_delta", delta: { type: "text_delta", text: "ok" } }
      yield { type: "content_block_stop" }
    }

    const mockAnthropicClient = {
      messages: { stream: vi.fn(() => mockStream()) },
    } as any

    streamAnthropicResponse({} as any, mockAnthropicClient, baseOpts)

    await vi.waitFor(() => {
      expect(mockEventStream.close).toHaveBeenCalled()
    })

    // Only the text delta and done event should be pushed
    expect(pushes).toHaveLength(2)
    expect(JSON.parse(pushes[0])).toEqual({ type: "text", content: "ok" })
    expect(JSON.parse(pushes[1])).toEqual({ type: "done" })
  })

  it("pushes error event when stream throws", async () => {
    const { pushes, mockEventStream } = setupMockEventStream()
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    async function* mockStream() {
      yield { type: "content_block_delta", delta: { type: "text_delta", text: "start" } }
      throw new Error("Stream connection lost")
    }

    const mockAnthropicClient = {
      messages: { stream: vi.fn(() => mockStream()) },
    } as any

    streamAnthropicResponse({} as any, mockAnthropicClient, baseOpts)

    await vi.waitFor(() => {
      expect(mockEventStream.close).toHaveBeenCalled()
    })

    const errorPush = pushes.find((p) => JSON.parse(p).type === "error")
    expect(errorPush).toBeDefined()
    expect(JSON.parse(errorPush!)).toEqual({
      type: "error",
      content: "An error occurred while generating the response. Please try again.",
    })

    consoleSpy.mockRestore()
  })

  it("calls eventStream.close() in finally", async () => {
    const { mockEventStream } = setupMockEventStream()

    async function* mockStream() {
      // empty stream
    }

    const mockAnthropicClient = {
      messages: { stream: vi.fn(() => mockStream()) },
    } as any

    streamAnthropicResponse({} as any, mockAnthropicClient, baseOpts)

    await vi.waitFor(() => {
      expect(mockEventStream.close).toHaveBeenCalledTimes(1)
    })
  })

  it("calls eventStream.close() even when stream throws", async () => {
    const { mockEventStream } = setupMockEventStream()
    vi.spyOn(console, "error").mockImplementation(() => {})

    // eslint-disable-next-line require-yield
    async function* mockStream() {
      throw new Error("fail")
    }

    const mockAnthropicClient = {
      messages: { stream: vi.fn(() => mockStream()) },
    } as any

    streamAnthropicResponse({} as any, mockAnthropicClient, baseOpts)

    await vi.waitFor(() => {
      expect(mockEventStream.close).toHaveBeenCalledTimes(1)
    })

    vi.restoreAllMocks()
  })

  it("returns eventStream.send() result", () => {
    const { mockEventStream } = setupMockEventStream()

    async function* mockStream() {}

    const mockAnthropicClient = {
      messages: { stream: vi.fn(() => mockStream()) },
    } as any

    const result = streamAnthropicResponse({} as any, mockAnthropicClient, baseOpts)
    expect(result).toBe("sent")
    expect(mockEventStream.send).toHaveBeenCalledOnce()
  })
})

// ─── callAnthropicJson ──────────────────────────────────────────────────

describe("callAnthropicJson", () => {
  const baseOpts = {
    model: "test-model",
    maxTokens: 2048,
    system: "System prompt",
    messages: [{ role: "user" as const, content: "Test" }],
  }

  it("parses valid JSON response", async () => {
    const expected = { name: "test", value: 42 }
    const mockClient = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: JSON.stringify(expected) }],
        }),
      },
    } as any

    const result = await callAnthropicJson(mockClient, baseOpts)
    expect(result).toEqual(expected)
  })

  it("passes correct parameters to messages.create", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: '{"ok":true}' }],
    })
    const mockClient = { messages: { create: mockCreate } } as any

    await callAnthropicJson(mockClient, {
      ...baseOpts,
      model: "my-model",
      maxTokens: 512,
      system: "Be helpful",
      messages: [{ role: "user", content: "Hello" }],
    })

    expect(mockCreate).toHaveBeenCalledWith({
      model: "my-model",
      max_tokens: 512,
      system: "Be helpful",
      messages: [{ role: "user", content: "Hello" }],
    })
  })

  it("throws when response has no text block (empty content array)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const mockClient = {
      messages: {
        create: vi.fn().mockResolvedValue({ content: [] }),
      },
    } as any

    // The inner createError (502) is caught by the outer catch and re-thrown as generic 500
    await expect(callAnthropicJson(mockClient, baseOpts)).rejects.toThrow(
      "AI request failed. Please try again.",
    )

    consoleSpy.mockRestore()
  })

  it("throws with custom errorLabel when response is empty", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const mockClient = {
      messages: {
        create: vi.fn().mockResolvedValue({ content: [] }),
      },
    } as any

    await expect(
      callAnthropicJson(mockClient, { ...baseOpts, errorLabel: "style analysis" }),
    ).rejects.toThrow("style analysis failed. Please try again.")

    consoleSpy.mockRestore()
  })

  it("throws 500 with 'Failed to parse' when response is invalid JSON", async () => {
    const mockClient = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: "not valid json {{{" }],
        }),
      },
    } as any

    await expect(callAnthropicJson(mockClient, baseOpts)).rejects.toThrow(
      "Failed to parse AI response",
    )
  })

  it("throws 500 with custom errorLabel for invalid JSON", async () => {
    const mockClient = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: "broken" }],
        }),
      },
    } as any

    await expect(
      callAnthropicJson(mockClient, { ...baseOpts, errorLabel: "review" }),
    ).rejects.toThrow("Failed to parse review response")
  })

  it("throws 500 when API call fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const mockClient = {
      messages: {
        create: vi.fn().mockRejectedValue(new Error("API rate limit")),
      },
    } as any

    await expect(callAnthropicJson(mockClient, baseOpts)).rejects.toThrow(
      "AI request failed. Please try again.",
    )

    consoleSpy.mockRestore()
  })

  it("throws with custom errorLabel in message when API call fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const mockClient = {
      messages: {
        create: vi.fn().mockRejectedValue(new Error("timeout")),
      },
    } as any

    await expect(
      callAnthropicJson(mockClient, { ...baseOpts, errorLabel: "style analysis" }),
    ).rejects.toThrow("style analysis failed. Please try again.")

    consoleSpy.mockRestore()
  })

  it("finds text block among mixed content types", async () => {
    const expected = { found: true }
    const mockClient = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [
            { type: "tool_use", id: "tool1", name: "test", input: {} },
            { type: "text", text: JSON.stringify(expected) },
          ],
        }),
      },
    } as any

    const result = await callAnthropicJson(mockClient, baseOpts)
    expect(result).toEqual(expected)
  })
})
