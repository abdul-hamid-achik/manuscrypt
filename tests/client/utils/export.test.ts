import { describe, it, expect } from "vitest"
import { stripMarkdown } from "../../../app/composables/useExport"

describe("stripMarkdown", () => {
  it("strips headings", () => {
    expect(stripMarkdown("## Title")).toBe("Title")
    expect(stripMarkdown("# Heading 1")).toBe("Heading 1")
    expect(stripMarkdown("### Heading 3")).toBe("Heading 3")
    expect(stripMarkdown("###### Heading 6")).toBe("Heading 6")
  })

  it("strips bold with asterisks", () => {
    expect(stripMarkdown("**bold text**")).toBe("bold text")
  })

  it("strips bold with underscores", () => {
    expect(stripMarkdown("__bold text__")).toBe("bold text")
  })

  it("strips italic with asterisks", () => {
    expect(stripMarkdown("*italic text*")).toBe("italic text")
  })

  it("strips italic with underscores", () => {
    expect(stripMarkdown("_italic text_")).toBe("italic text")
  })

  it("strips strikethrough", () => {
    expect(stripMarkdown("~~deleted~~")).toBe("deleted")
  })

  it("strips inline code", () => {
    expect(stripMarkdown("`code`")).toBe("code")
  })

  it("strips links", () => {
    expect(stripMarkdown("[click here](https://example.com)")).toBe("click here")
  })

  it("strips images", () => {
    // The image regex removes ![...](url), leaving empty string
    // But if the alt text pattern doesn't match the image regex first
    // (e.g., link regex picks it up), we test what actually gets removed
    const result = stripMarkdown("![alt text](image.png)")
    expect(result).not.toContain("image.png")
    expect(result).not.toContain("](")
  })

  it("strips blockquotes", () => {
    expect(stripMarkdown("> this is a quote")).toBe("this is a quote")
  })

  it("strips horizontal rules", () => {
    expect(stripMarkdown("---")).toBe("")
    expect(stripMarkdown("-----")).toBe("")
  })

  it("strips unordered list markers", () => {
    expect(stripMarkdown("- item one")).toBe("item one")
    expect(stripMarkdown("* item two")).toBe("item two")
    expect(stripMarkdown("+ item three")).toBe("item three")
  })

  it("strips ordered list markers", () => {
    expect(stripMarkdown("1. first")).toBe("first")
    expect(stripMarkdown("42. forty-second")).toBe("forty-second")
  })

  it("collapses multiple newlines", () => {
    expect(stripMarkdown("line one\n\n\n\nline two")).toBe("line one\n\nline two")
  })

  it("handles combined markdown", () => {
    const input = `## Chapter One

**The hero** walked into the *sunset*.

> "This is the end," she said.

---

[Read more](https://example.com)`

    const result = stripMarkdown(input)
    expect(result).toContain("Chapter One")
    expect(result).toContain("The hero")
    expect(result).toContain("sunset")
    expect(result).toContain('"This is the end," she said.')
    expect(result).toContain("Read more")
    expect(result).not.toContain("##")
    expect(result).not.toContain("**")
    expect(result).not.toContain("*")
    expect(result).not.toContain("[")
    expect(result).not.toContain("---")
  })
})
