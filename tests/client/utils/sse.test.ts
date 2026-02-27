import { describe, it, expect, vi } from "vitest"
import { parseSseLines, readSseStream } from "../../../app/utils/sse"

describe("parseSseLines", () => {
  it("parses a simple SSE data line", () => {
    const result = parseSseLines('data: {"type":"text","content":"Hello"}')
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ type: "text", content: "Hello" })
  })

  it("parses multiple lines", () => {
    const chunk = 'data: {"type":"text","content":"Hello"}\ndata: {"type":"text","content":" World"}'
    const result = parseSseLines(chunk)
    expect(result).toHaveLength(2)
    expect(result[0].content).toBe("Hello")
    expect(result[1].content).toBe(" World")
  })

  it("skips empty lines", () => {
    const chunk = 'data: {"type":"text","content":"Hello"}\n\n\n'
    const result = parseSseLines(chunk)
    expect(result).toHaveLength(1)
  })

  it("skips malformed JSON", () => {
    const chunk = 'data: {"type":"text","content":"OK"}\ndata: not json\n'
    const result = parseSseLines(chunk)
    expect(result).toHaveLength(1)
    expect(result[0].content).toBe("OK")
  })

  it("handles lines without data: prefix", () => {
    const chunk = '{"type":"done"}'
    const result = parseSseLines(chunk)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe("done")
  })

  it("parses done event", () => {
    const result = parseSseLines('data: {"type":"done"}')
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe("done")
    expect(result[0].content).toBeUndefined()
  })

  it("parses error event", () => {
    const result = parseSseLines('data: {"type":"error","content":"Something went wrong"}')
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe("error")
    expect(result[0].content).toBe("Something went wrong")
  })

  it("returns empty array for empty string", () => {
    expect(parseSseLines("")).toHaveLength(0)
  })

  it("returns empty array for whitespace only", () => {
    expect(parseSseLines("  \n  \n  ")).toHaveLength(0)
  })
})

describe("readSseStream", () => {
  function createMockStream(chunks: string[]): ReadableStream {
    const encoder = new TextEncoder()
    let index = 0
    return new ReadableStream({
      pull(controller) {
        if (index < chunks.length) {
          controller.enqueue(encoder.encode(chunks[index]))
          index++
        } else {
          controller.close()
        }
      },
    })
  }

  it("reads and parses a stream", async () => {
    const stream = createMockStream([
      'data: {"type":"text","content":"Hello"}\n',
      'data: {"type":"text","content":" World"}\n',
      'data: {"type":"done"}\n',
    ])

    const received: Array<{ type: string; content?: string }> = []
    await readSseStream(stream, (data) => received.push(data))

    expect(received).toHaveLength(3)
    expect(received[0]).toEqual({ type: "text", content: "Hello" })
    expect(received[1]).toEqual({ type: "text", content: " World" })
    expect(received[2]).toEqual({ type: "done" })
  })

  it("handles empty stream", async () => {
    const stream = createMockStream([])
    const received: Array<{ type: string; content?: string }> = []
    await readSseStream(stream, (data) => received.push(data))
    expect(received).toHaveLength(0)
  })

  it("handles multiple events in one chunk", async () => {
    const stream = createMockStream([
      'data: {"type":"text","content":"A"}\ndata: {"type":"text","content":"B"}\n',
    ])
    const received: Array<{ type: string; content?: string }> = []
    await readSseStream(stream, (data) => received.push(data))
    expect(received).toHaveLength(2)
  })
})
