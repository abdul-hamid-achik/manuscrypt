import { db } from "../database"
import { books, chapters, characters } from "../database/schema"
import { eq } from "drizzle-orm"

export interface BookContext {
  title: string
  genre: string | null
  premise: string | null
  styleGuide: string | null
  characters: Array<{
    name: string
    role: string | null
    description: string | null
    motivation: string | null
    fear: string | null
    contradiction: string | null
    voiceNotes: string | null
  }>
  chapterSynopsis: string | null
  currentContent: string | null
}

export function buildBookContext(bookId: string, chapterId?: string): BookContext {
  const book = db.select().from(books).where(eq(books.id, bookId)).get()
  if (!book) {
    return {
      title: "Untitled",
      genre: "Literary Fiction",
      premise: null,
      styleGuide: null,
      characters: [],
      chapterSynopsis: null,
      currentContent: null,
    }
  }

  const bookCharacters = db
    .select()
    .from(characters)
    .where(eq(characters.bookId, bookId))
    .all()

  let chapterSynopsis: string | null = null
  let currentContent: string | null = null

  if (chapterId) {
    const chapter = db
      .select()
      .from(chapters)
      .where(eq(chapters.id, chapterId))
      .get()
    if (chapter) {
      chapterSynopsis = chapter.synopsis
      currentContent = chapter.content
    }
  }

  return {
    title: book.title,
    genre: book.genre,
    premise: book.premise,
    styleGuide: book.styleGuide,
    characters: bookCharacters.map((c) => ({
      name: c.name,
      role: c.role,
      description: c.description,
      motivation: c.motivation,
      fear: c.fear,
      contradiction: c.contradiction,
      voiceNotes: c.voiceNotes,
    })),
    chapterSynopsis,
    currentContent,
  }
}

export function buildSystemPrompt(
  ctx: BookContext,
  command?: string,
  selectedText?: string,
): string {
  let prompt = `You are a literary fiction writing assistant for the novel "${ctx.title}".
Genre: ${ctx.genre ?? "Literary Fiction"}.`

  if (ctx.premise) prompt += `\nPremise: ${ctx.premise}`
  if (ctx.styleGuide) prompt += `\n\nStyle Guide: ${ctx.styleGuide}`

  if (ctx.characters.length > 0) {
    prompt += `\n\nKey Characters:`
    for (const char of ctx.characters) {
      prompt += `\n- ${char.name}`
      if (char.role) prompt += ` (${char.role})`
      if (char.description) prompt += `: ${char.description}`
      if (char.motivation) prompt += ` | Motivation: ${char.motivation}`
      if (char.fear) prompt += ` | Fear: ${char.fear}`
      if (char.contradiction) prompt += ` | Internal conflict: ${char.contradiction}`
    }
  }

  if (ctx.chapterSynopsis) prompt += `\n\nCurrent Chapter Synopsis: ${ctx.chapterSynopsis}`

  switch (command) {
    case "continue":
      prompt += `\n\nYour task: Continue writing the narrative seamlessly from where the writer left off. Match the established voice, tone, and pacing. Write 200-400 words of new prose that flows naturally. Focus on literary quality, sensory details, and psychological depth.`
      break
    case "deepen":
      prompt += `\n\nYour task: Rewrite the provided passage with greater psychological depth and literary richness. Add internal monologue, sensory details, subtext, emotional complexity, and imagery. Maintain the same events but make the prose more layered and literary.`
      break
    case "dialogue":
      prompt += `\n\nYour task: Generate authentic dialogue for characters in this scene. Each character should have a distinct voice. Focus on subtext, character-specific speech patterns, tension, and natural rhythm. Use action beats between lines.`
      break
    case "sensory":
      prompt += `\n\nYour task: Enrich the passage with vivid sensory details — visual, auditory, olfactory, tactile, gustatory. Weave them naturally into the prose without overloading.`
      break
    default:
      prompt += `\n\nYou are a thoughtful writing assistant. Help with brainstorming, feedback, plotting, character development, prose critique, or discussion. Be specific and insightful.`
  }

  return prompt
}
