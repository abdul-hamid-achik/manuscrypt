import { db } from "../database"
import { chapters, characters, characterRelationships, locations, scenes } from "../database/schema"
import { eq, and, like, asc, sql } from "drizzle-orm"
import { tiptapJsonToText } from "./tiptap"
import type { TipTapNode } from "~~/shared/types"

interface ToolResult {
  content: string
  is_error?: boolean
  wroteData?: boolean
}

export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  bookId: string,
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case "lookup_character":
        return lookupCharacter(bookId, toolInput.name as string)
      case "lookup_location":
        return lookupLocation(bookId, toolInput.name as string)
      case "get_chapter_content":
        return getChapterContent(bookId, toolInput.chapterNumber as number)
      case "list_chapters":
        return listChapters(bookId)
      case "get_character_relationships":
        return getCharacterRelationships(bookId, toolInput.name as string)
      case "insert_text":
        return insertText(bookId, toolInput.chapterNumber as number, toolInput.text as string)
      case "replace_text":
        return replaceText(bookId, toolInput.chapterNumber as number, toolInput.oldText as string, toolInput.newText as string)
      case "update_character":
        return updateCharacter(bookId, toolInput.name as string, toolInput.updates as Record<string, string>)
      case "create_scene":
        return createScene(bookId, toolInput as Record<string, unknown>)
      default:
        return { content: `Unknown tool: ${toolName}`, is_error: true }
    }
  } catch (error) {
    console.error(`[AI Tool Error] ${toolName}:`, error instanceof Error ? error.message : error)
    return {
      content: `Tool error: ${error instanceof Error ? error.message : "Unknown error"}`,
      is_error: true,
    }
  }
}

// ── Read-Only Tools ──

function lookupCharacter(bookId: string, name: string): ToolResult {
  const results = db
    .select()
    .from(characters)
    .where(and(eq(characters.bookId, bookId), like(characters.name, `%${name}%`)))
    .all()

  if (results.length === 0) {
    return { content: `No character found matching "${name}" in this book.` }
  }

  const formatted = results.map((c) => {
    const parts = [`Name: ${c.name}`]
    if (c.role) parts.push(`Role: ${c.role}`)
    if (c.age) parts.push(`Age: ${c.age}`)
    if (c.archetype) parts.push(`Archetype: ${c.archetype}`)
    if (c.description) parts.push(`Description: ${c.description}`)
    if (c.motivation) parts.push(`Motivation: ${c.motivation}`)
    if (c.fear) parts.push(`Fear: ${c.fear}`)
    if (c.contradiction) parts.push(`Internal conflict: ${c.contradiction}`)
    if (c.traits) parts.push(`Traits: ${c.traits}`)
    if (c.backstory) parts.push(`Backstory: ${c.backstory}`)
    if (c.voiceNotes) parts.push(`Voice notes: ${c.voiceNotes}`)
    return parts.join("\n")
  })

  return { content: formatted.join("\n\n---\n\n") }
}

function lookupLocation(bookId: string, name: string): ToolResult {
  const results = db
    .select()
    .from(locations)
    .where(and(eq(locations.bookId, bookId), like(locations.name, `%${name}%`)))
    .all()

  if (results.length === 0) {
    return { content: `No location found matching "${name}" in this book.` }
  }

  const formatted = results.map((l) => {
    const parts = [`Name: ${l.name}`]
    if (l.description) parts.push(`Description: ${l.description}`)
    if (l.sensoryDetails) parts.push(`Sensory details: ${l.sensoryDetails}`)
    if (l.emotionalTone) parts.push(`Emotional tone: ${l.emotionalTone}`)
    return parts.join("\n")
  })

  return { content: formatted.join("\n\n---\n\n") }
}

function getChapterContent(bookId: string, chapterNumber: number): ToolResult {
  const chapter = db
    .select()
    .from(chapters)
    .where(and(eq(chapters.bookId, bookId), eq(chapters.number, chapterNumber)))
    .get()

  if (!chapter) {
    return { content: `No chapter ${chapterNumber} found in this book.`, is_error: true }
  }

  const text = tiptapJsonToText(chapter.content)
  return {
    content: `Chapter ${chapter.number}: "${chapter.title}"\nWord count: ${chapter.wordCount ?? 0}\nStatus: ${chapter.status ?? "planned"}\n\n${text || "(empty chapter)"}`,
  }
}

function listChapters(bookId: string): ToolResult {
  const allChapters = db
    .select()
    .from(chapters)
    .where(eq(chapters.bookId, bookId))
    .orderBy(asc(chapters.sortOrder))
    .all()

  if (allChapters.length === 0) {
    return { content: "No chapters found in this book." }
  }

  const formatted = allChapters.map((ch) => {
    const parts = [`Chapter ${ch.number}: "${ch.title}"`]
    parts.push(`  Status: ${ch.status ?? "planned"}`)
    parts.push(`  Word count: ${ch.wordCount ?? 0}`)
    if (ch.synopsis) parts.push(`  Synopsis: ${ch.synopsis}`)
    if (ch.act) parts.push(`  Act: ${ch.act}`)
    return parts.join("\n")
  })

  return { content: formatted.join("\n\n") }
}

function getCharacterRelationships(bookId: string, name: string): ToolResult {
  // First find the character
  const character = db
    .select()
    .from(characters)
    .where(and(eq(characters.bookId, bookId), like(characters.name, `%${name}%`)))
    .get()

  if (!character) {
    return { content: `No character found matching "${name}" in this book.` }
  }

  // Get all characters for name resolution
  const allCharacters = db
    .select()
    .from(characters)
    .where(eq(characters.bookId, bookId))
    .all()
  const charNameMap = new Map(allCharacters.map((c) => [c.id, c.name]))

  // Find relationships where this character is involved
  const fromRels = db
    .select()
    .from(characterRelationships)
    .where(and(eq(characterRelationships.bookId, bookId), eq(characterRelationships.fromCharacterId, character.id)))
    .all()

  const toRels = db
    .select()
    .from(characterRelationships)
    .where(and(eq(characterRelationships.bookId, bookId), eq(characterRelationships.toCharacterId, character.id)))
    .all()

  const allRels = [
    ...fromRels.map((r) => ({
      otherName: charNameMap.get(r.toCharacterId) ?? "Unknown",
      type: r.relationshipType,
      description: r.description,
      direction: "to" as const,
    })),
    ...toRels.map((r) => ({
      otherName: charNameMap.get(r.fromCharacterId) ?? "Unknown",
      type: r.relationshipType,
      description: r.description,
      direction: "from" as const,
    })),
  ]

  if (allRels.length === 0) {
    return { content: `No relationships found for "${character.name}".` }
  }

  const formatted = allRels.map((r) => {
    let line = `${character.name} → ${r.otherName}: ${r.type}`
    if (r.description) line += ` — ${r.description}`
    return line
  })

  return { content: `Relationships for ${character.name}:\n${formatted.join("\n")}` }
}

// ── Write Tools ──

function findChapterByNumber(bookId: string, chapterNumber: number) {
  return db
    .select()
    .from(chapters)
    .where(and(eq(chapters.bookId, bookId), eq(chapters.number, chapterNumber)))
    .get()
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

function insertText(bookId: string, chapterNumber: number, text: string): ToolResult {
  const chapter = findChapterByNumber(bookId, chapterNumber)
  if (!chapter) {
    return { content: `No chapter ${chapterNumber} found in this book.`, is_error: true }
  }

  // Parse existing content or create empty doc
  let doc: TipTapNode
  try {
    doc = chapter.content ? JSON.parse(chapter.content) : { type: "doc", content: [] }
  } catch {
    doc = { type: "doc", content: [] }
  }

  // Create paragraph nodes from the new text
  const paragraphs = text.split(/\n{2,}/).filter(Boolean)
  for (const para of paragraphs) {
    doc.content!.push({
      type: "paragraph",
      content: [{ type: "text", text: para.trim() }],
    })
  }

  const newContent = JSON.stringify(doc)
  const newWordCount = countWords(tiptapJsonToText(newContent))

  db.update(chapters)
    .set({
      content: newContent,
      wordCount: newWordCount,
      updatedAt: sql`(datetime('now'))`,
    })
    .where(eq(chapters.id, chapter.id))
    .run()

  return {
    content: `Appended ${paragraphs.length} paragraph(s) to Chapter ${chapterNumber}. New word count: ${newWordCount}.`,
    wroteData: true,
  }
}

function replaceText(bookId: string, chapterNumber: number, oldText: string, newText: string): ToolResult {
  const chapter = findChapterByNumber(bookId, chapterNumber)
  if (!chapter) {
    return { content: `No chapter ${chapterNumber} found in this book.`, is_error: true }
  }

  if (!chapter.content) {
    return { content: `Chapter ${chapterNumber} has no content to search.`, is_error: true }
  }

  // Get plain text to verify the old text exists
  const plainText = tiptapJsonToText(chapter.content)
  if (!plainText.includes(oldText)) {
    return { content: `Could not find the exact text "${oldText.slice(0, 100)}..." in Chapter ${chapterNumber}.`, is_error: true }
  }

  // Work on the JSON content — replace text within paragraph nodes
  let doc: TipTapNode
  try {
    doc = JSON.parse(chapter.content)
  } catch {
    return { content: `Failed to parse chapter content.`, is_error: true }
  }

  // Replace in text nodes across the document
  replaceInNode(doc, oldText, newText)

  const newContent = JSON.stringify(doc)
  const newWordCount = countWords(tiptapJsonToText(newContent))

  db.update(chapters)
    .set({
      content: newContent,
      wordCount: newWordCount,
      updatedAt: sql`(datetime('now'))`,
    })
    .where(eq(chapters.id, chapter.id))
    .run()

  return {
    content: `Replaced text in Chapter ${chapterNumber}. New word count: ${newWordCount}.`,
    wroteData: true,
  }
}

function replaceInNode(node: TipTapNode, oldText: string, newText: string): void {
  if (node.type === "text" && node.text) {
    node.text = node.text.replace(oldText, newText)
  }
  if (node.content) {
    for (const child of node.content) {
      replaceInNode(child, oldText, newText)
    }
  }
}

function updateCharacter(bookId: string, name: string, updates: Record<string, string>): ToolResult {
  const character = db
    .select()
    .from(characters)
    .where(and(eq(characters.bookId, bookId), like(characters.name, `%${name}%`)))
    .get()

  if (!character) {
    return { content: `No character found matching "${name}" in this book.`, is_error: true }
  }

  const allowedFields = [
    "name", "role", "age", "archetype", "description",
    "motivation", "fear", "contradiction", "voiceNotes", "traits", "backstory",
  ] as const

  const updateData: Record<string, unknown> = { updatedAt: sql`(datetime('now'))` }
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updateData[field] = updates[field]
    }
  }

  db.update(characters)
    .set(updateData)
    .where(eq(characters.id, character.id))
    .run()

  return {
    content: `Updated character "${character.name}" with fields: ${Object.keys(updates).join(", ")}.`,
    wroteData: true,
  }
}

function createScene(bookId: string, input: Record<string, unknown>): ToolResult {
  const chapterNumber = input.chapterNumber as number
  const chapter = findChapterByNumber(bookId, chapterNumber)
  if (!chapter) {
    return { content: `No chapter ${chapterNumber} found in this book.`, is_error: true }
  }

  // Resolve POV character name to ID
  let povCharacterId: string | null = null
  if (input.povCharacterName) {
    const character = db
      .select()
      .from(characters)
      .where(and(eq(characters.bookId, bookId), like(characters.name, `%${input.povCharacterName as string}%`)))
      .get()
    if (character) povCharacterId = character.id
  }

  // Resolve location name to ID
  let locationId: string | null = null
  if (input.locationName) {
    const location = db
      .select()
      .from(locations)
      .where(and(eq(locations.bookId, bookId), like(locations.name, `%${input.locationName as string}%`)))
      .get()
    if (location) locationId = location.id
  }

  // Find max sort order for this chapter's scenes
  const lastScene = db
    .select({ maxSort: sql<number>`COALESCE(MAX(${scenes.sortOrder}), -1)` })
    .from(scenes)
    .where(eq(scenes.chapterId, chapter.id))
    .get()
  const nextSortOrder = (lastScene?.maxSort ?? -1) + 1

  const sceneId = crypto.randomUUID()
  db.insert(scenes)
    .values({
      id: sceneId,
      chapterId: chapter.id,
      title: input.title as string,
      synopsis: (input.synopsis as string) ?? null,
      povCharacterId,
      locationId,
      moodStart: (input.moodStart as string) ?? null,
      moodEnd: (input.moodEnd as string) ?? null,
      sortOrder: nextSortOrder,
    })
    .run()

  return {
    content: `Created scene "${input.title}" in Chapter ${chapterNumber} (sort order: ${nextSortOrder}).`,
    wroteData: true,
  }
}
