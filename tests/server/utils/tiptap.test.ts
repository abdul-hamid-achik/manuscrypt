import { describe, it, expect } from "vitest"
import { tiptapJsonToText, extractText } from "../../../server/utils/tiptap"

describe("tiptapJsonToText", () => {
  it("returns empty string for null", () => {
    expect(tiptapJsonToText(null)).toBe("")
  })

  it("returns empty string for empty string", () => {
    expect(tiptapJsonToText("")).toBe("")
  })

  it("returns plain text for non-JSON content", () => {
    expect(tiptapJsonToText("just plain text")).toBe("just plain text")
  })

  it("converts a simple paragraph", () => {
    const doc = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello world" }],
        },
      ],
    })
    expect(tiptapJsonToText(doc)).toBe("Hello world\n\n")
  })

  it("converts multiple paragraphs", () => {
    const doc = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "First paragraph" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Second paragraph" }],
        },
      ],
    })
    expect(tiptapJsonToText(doc)).toBe("First paragraph\n\nSecond paragraph\n\n")
  })

  it("converts headings with level offset", () => {
    const doc = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Title" }],
        },
      ],
    })
    // level 1 + offset 2 = ###
    expect(tiptapJsonToText(doc)).toBe("### Title\n\n")
  })

  it("converts blockquotes", () => {
    const doc = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Quoted text" }],
            },
          ],
        },
      ],
    })
    const result = tiptapJsonToText(doc)
    expect(result).toContain("> Quoted text")
  })

  it("converts horizontal rules", () => {
    const doc = JSON.stringify({
      type: "doc",
      content: [{ type: "horizontalRule" }],
    })
    expect(tiptapJsonToText(doc)).toBe("---\n\n")
  })

  it("handles hard breaks", () => {
    const doc = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Line one" },
            { type: "hardBreak" },
            { type: "text", text: "Line two" },
          ],
        },
      ],
    })
    expect(tiptapJsonToText(doc)).toBe("Line one\nLine two\n\n")
  })
})

describe("extractText", () => {
  it("returns empty string for falsy node", () => {
    expect(extractText(null as any)).toBe("")
  })

  it("extracts text from a text node", () => {
    expect(extractText({ type: "text", text: "Hello" })).toBe("Hello")
  })

  it("handles text node with no text", () => {
    expect(extractText({ type: "text" })).toBe("")
  })

  it("recursively extracts from nested content", () => {
    const node = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Nested" }],
        },
      ],
    }
    expect(extractText(node)).toBe("Nested\n\n")
  })
})
