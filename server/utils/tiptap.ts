import type { TipTapNode } from "~~/shared/types"

export function tiptapJsonToText(content: string | null): string {
  if (!content) return ""

  try {
    const doc = JSON.parse(content)
    return extractText(doc)
  } catch {
    return content
  }
}

export function extractText(node: TipTapNode): string {
  if (!node) return ""

  if (node.type === "text") return node.text ?? ""

  if (node.type === "paragraph") {
    const inner = (node.content ?? []).map(extractText).join("")
    return inner + "\n\n"
  }

  if (node.type === "heading") {
    const level = node.attrs?.level ?? 3
    const prefix = "#".repeat(level + 2) + " "
    const inner = (node.content ?? []).map(extractText).join("")
    return prefix + inner + "\n\n"
  }

  if (node.type === "hardBreak") return "\n"

  if (node.type === "blockquote") {
    const inner = (node.content ?? []).map(extractText).join("")
    return inner
      .split("\n")
      .map((line: string) => (line.trim() ? `> ${line}` : ">"))
      .join("\n") + "\n\n"
  }

  if (node.type === "horizontalRule") return "---\n\n"

  if (node.content && Array.isArray(node.content)) {
    return node.content.map(extractText).join("")
  }

  return ""
}
