import { db } from "../../database"
import { books, chapters } from "../../database/schema"
import { eq, asc } from "drizzle-orm"
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  SectionType,
  convertInchesToTwip,
  TabStopPosition,
  TabStopType,
} from "docx"
import type { TipTapNode } from "~~/shared/types"

function tiptapToDocxParagraphs(content: string | null): Paragraph[] {
  if (!content) return []

  try {
    const doc: TipTapNode = JSON.parse(content)
    return convertNodes(doc)
  } catch {
    // Plain text fallback
    return content
      .split("\n\n")
      .filter((p) => p.trim())
      .map(
        (p) =>
          new Paragraph({
            children: [new TextRun({ text: p.trim(), font: "Times New Roman", size: 24 })],
            spacing: { line: 480 },
          })
      )
  }
}

function convertNodes(node: TipTapNode): Paragraph[] {
  if (!node) return []

  if (node.type === "doc" && node.content) {
    return node.content.flatMap(convertNodes)
  }

  if (node.type === "paragraph") {
    const runs = extractRuns(node.content ?? [])
    return [
      new Paragraph({
        children: runs.length > 0 ? runs : [new TextRun({ text: "", font: "Times New Roman", size: 24 })],
        spacing: { line: 480 },
        indent: { firstLine: convertInchesToTwip(0.5) },
      }),
    ]
  }

  if (node.type === "heading") {
    const level = node.attrs?.level ?? 2
    const headingLevel =
      level === 1
        ? HeadingLevel.HEADING_2
        : level === 2
          ? HeadingLevel.HEADING_3
          : HeadingLevel.HEADING_4
    const runs = extractRuns(node.content ?? [])
    return [
      new Paragraph({
        children: runs,
        heading: headingLevel,
        spacing: { before: 240, after: 120, line: 480 },
      }),
    ]
  }

  if (node.type === "blockquote") {
    const innerParagraphs = (node.content ?? []).flatMap(convertNodes)
    return innerParagraphs.map(
      (_p, i) => {
        const runs = extractRuns((node.content ?? [])[i]?.content ?? [])
        return new Paragraph({
          children: runs,
          spacing: { line: 480 },
          indent: {
            left: convertInchesToTwip(0.5),
            right: convertInchesToTwip(0.5),
          },
          style: "IntenseQuote",
        })
      }
    )
  }

  if (node.type === "horizontalRule") {
    return [
      new Paragraph({
        children: [new TextRun({ text: "* * *", font: "Times New Roman", size: 24 })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 240, line: 480 },
      }),
    ]
  }

  if (node.content && Array.isArray(node.content)) {
    return node.content.flatMap(convertNodes)
  }

  return []
}

function extractRuns(nodes: TipTapNode[]): TextRun[] {
  const runs: TextRun[] = []

  for (const node of nodes) {
    if (node.type === "text") {
      const bold = node.marks?.some((m) => m.type === "bold") ?? false
      const italic = node.marks?.some((m) => m.type === "italic") ?? false
      const underline = node.marks?.some((m) => m.type === "underline")
        ? { type: "single" as const }
        : undefined

      runs.push(
        new TextRun({
          text: node.text ?? "",
          font: "Times New Roman",
          size: 24,
          bold,
          italics: italic,
          underline,
        })
      )
    } else if (node.type === "hardBreak") {
      runs.push(new TextRun({ break: 1, font: "Times New Roman", size: 24 }))
    }
  }

  return runs
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.bookId) {
    throw createError({ statusCode: 400, message: "bookId is required" })
  }

  const book = db.select().from(books).where(eq(books.id, body.bookId)).get()
  if (!book) {
    throw createError({ statusCode: 404, message: "Book not found" })
  }

  const allChapters = db
    .select()
    .from(chapters)
    .where(eq(chapters.bookId, body.bookId))
    .orderBy(asc(chapters.sortOrder))
    .all()

  // Build title page section
  const titlePageChildren: Paragraph[] = [
    // Spacer to push content down
    ...Array.from({ length: 12 }, () => new Paragraph({ spacing: { line: 480 } })),
    new Paragraph({
      children: [
        new TextRun({
          text: book.title.toUpperCase(),
          font: "Times New Roman",
          size: 48,
          bold: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200, line: 480 },
    }),
  ]

  if (book.genre) {
    titlePageChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: book.genre,
            font: "Times New Roman",
            size: 28,
            italics: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200, line: 480 },
      })
    )
  }

  if (book.premise) {
    titlePageChildren.push(
      new Paragraph({ spacing: { line: 480 } }),
      new Paragraph({
        children: [
          new TextRun({
            text: book.premise,
            font: "Times New Roman",
            size: 24,
            italics: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { line: 480 },
      })
    )
  }

  // Build chapter sections
  const chapterSections = allChapters.map((chapter) => {
    const chapterTitle = chapter.title || `Chapter ${chapter.number}`
    const bodyParagraphs = tiptapToDocxParagraphs(chapter.content)

    return {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          margin: {
            top: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
          },
        },
      },
      children: [
        // Chapter number
        new Paragraph({
          children: [
            new TextRun({
              text: `Chapter ${chapter.number}`,
              font: "Times New Roman",
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 120, line: 480 },
        }),
        // Chapter title
        new Paragraph({
          children: [
            new TextRun({
              text: chapterTitle,
              font: "Times New Roman",
              size: 32,
              bold: true,
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 480, line: 480 },
        }),
        ...bodyParagraphs,
      ],
    }
  })

  const doc = new Document({
    creator: "Manuscrypt",
    title: book.title,
    description: book.premise ?? undefined,
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: 24,
          },
          paragraph: {
            spacing: { line: 480 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children: titlePageChildren,
      },
      ...chapterSections,
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  const filename = `${book.title.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}.docx`

  setResponseHeaders(event, {
    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Length": buffer.byteLength.toString(),
  })

  return buffer
})
