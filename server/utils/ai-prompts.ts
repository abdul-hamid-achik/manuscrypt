import { db } from "../database"
import { books, chapters, characters, locations, characterRelationships, scenes } from "../database/schema"
import { eq, and, lt, gt, asc, desc } from "drizzle-orm"
import { tiptapJsonToText } from "./tiptap"

// Rough token estimate: ~4 chars per token for English prose
const CHARS_PER_TOKEN = 4
const MAX_CONTEXT_TOKENS = 8000
const MAX_CONTEXT_CHARS = MAX_CONTEXT_TOKENS * CHARS_PER_TOKEN

/** Truncate a string to a max character count, appending "..." if truncated */
function truncate(text: string | null, maxChars: number): string | null {
  if (!text) return null
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars) + "..."
}

export interface BookContext {
  title: string
  genre: string | null
  premise: string | null
  styleGuide: string | null
  characters: Array<{
    name: string
    role: string | null
    age: string | null
    archetype: string | null
    description: string | null
    motivation: string | null
    fear: string | null
    contradiction: string | null
    voiceNotes: string | null
    traits: string | null
    backstory: string | null
  }>
  locations: Array<{
    name: string
    description: string | null
    sensoryDetails: string | null
    emotionalTone: string | null
  }>
  relationships: Array<{
    fromCharacterName: string
    toCharacterName: string
    relationshipType: string
    description: string | null
  }>
  scenes: Array<{
    title: string
    synopsis: string | null
    povCharacterName: string | null
    locationName: string | null
    moodStart: string | null
    moodEnd: string | null
  }>
  neighboringSynopses: Array<{
    number: number
    title: string
    synopsis: string | null
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
      locations: [],
      relationships: [],
      scenes: [],
      neighboringSynopses: [],
      chapterSynopsis: null,
      currentContent: null,
    }
  }

  const bookCharacters = db
    .select()
    .from(characters)
    .where(eq(characters.bookId, bookId))
    .all()

  const bookLocations = db
    .select()
    .from(locations)
    .where(eq(locations.bookId, bookId))
    .all()

  // Build lookup maps for resolving IDs to names
  const charNameMap = new Map(bookCharacters.map(c => [c.id, c.name]))
  const locationNameMap = new Map(bookLocations.map(l => [l.id, l.name]))

  const bookRelationships = db
    .select()
    .from(characterRelationships)
    .where(eq(characterRelationships.bookId, bookId))
    .all()

  let chapterSynopsis: string | null = null
  let currentContent: string | null = null
  let chapterScenes: BookContext["scenes"] = []
  const neighboringSynopses: BookContext["neighboringSynopses"] = []

  if (chapterId) {
    const chapter = db
      .select()
      .from(chapters)
      .where(eq(chapters.id, chapterId))
      .get()
    if (chapter) {
      chapterSynopsis = chapter.synopsis
      currentContent = tiptapJsonToText(chapter.content)

      // Fetch scenes for this chapter
      const rawScenes = db
        .select()
        .from(scenes)
        .where(eq(scenes.chapterId, chapterId))
        .orderBy(asc(scenes.sortOrder))
        .all()

      chapterScenes = rawScenes.map(s => ({
        title: s.title,
        synopsis: s.synopsis,
        povCharacterName: s.povCharacterId ? charNameMap.get(s.povCharacterId) ?? null : null,
        locationName: s.locationId ? locationNameMap.get(s.locationId) ?? null : null,
        moodStart: s.moodStart,
        moodEnd: s.moodEnd,
      }))

      // Fetch neighboring chapter synopses
      const prevChapter = db
        .select()
        .from(chapters)
        .where(and(eq(chapters.bookId, bookId), lt(chapters.sortOrder, chapter.sortOrder)))
        .orderBy(desc(chapters.sortOrder))
        .limit(1)
        .get()

      const nextChapter = db
        .select()
        .from(chapters)
        .where(and(eq(chapters.bookId, bookId), gt(chapters.sortOrder, chapter.sortOrder)))
        .orderBy(asc(chapters.sortOrder))
        .limit(1)
        .get()

      if (prevChapter) {
        neighboringSynopses.push({
          number: prevChapter.number,
          title: prevChapter.title,
          synopsis: prevChapter.synopsis,
        })
      }
      if (nextChapter) {
        neighboringSynopses.push({
          number: nextChapter.number,
          title: nextChapter.title,
          synopsis: nextChapter.synopsis,
        })
      }
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
      age: c.age,
      archetype: c.archetype,
      description: c.description,
      motivation: c.motivation,
      fear: c.fear,
      contradiction: c.contradiction,
      voiceNotes: c.voiceNotes,
      traits: c.traits,
      backstory: c.backstory,
    })),
    locations: bookLocations.map(l => ({
      name: l.name,
      description: l.description,
      sensoryDetails: l.sensoryDetails,
      emotionalTone: l.emotionalTone,
    })),
    relationships: bookRelationships.map(r => ({
      fromCharacterName: charNameMap.get(r.fromCharacterId) ?? "Unknown",
      toCharacterName: charNameMap.get(r.toCharacterId) ?? "Unknown",
      relationshipType: r.relationshipType,
      description: r.description,
    })),
    scenes: chapterScenes,
    neighboringSynopses,
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
    // Budget: ~500 chars per character for backstory, 200 for description
    for (const char of ctx.characters) {
      prompt += `\n- ${char.name}`
      if (char.role) prompt += ` (${char.role})`
      if (char.age) prompt += `, age ${char.age}`
      if (char.archetype) prompt += ` [${char.archetype}]`
      if (char.description) prompt += `: ${truncate(char.description, 200)}`
      if (char.motivation) prompt += ` | Motivation: ${truncate(char.motivation, 200)}`
      if (char.fear) prompt += ` | Fear: ${truncate(char.fear, 200)}`
      if (char.contradiction) prompt += ` | Internal conflict: ${truncate(char.contradiction, 200)}`
      if (char.traits) prompt += ` | Traits: ${truncate(char.traits, 200)}`
      if (char.backstory) prompt += ` | Backstory: ${truncate(char.backstory, 500)}`
      if (char.voiceNotes) prompt += ` | Voice: ${truncate(char.voiceNotes, 200)}`
    }
  }

  if (ctx.relationships?.length > 0) {
    prompt += `\n\nCharacter Relationships:`
    for (const rel of ctx.relationships) {
      prompt += `\n- ${rel.fromCharacterName} → ${rel.toCharacterName} (${rel.relationshipType})`
      if (rel.description) prompt += `: ${rel.description}`
    }
  }

  if (ctx.locations?.length > 0) {
    prompt += `\n\nLocations:`
    for (const loc of ctx.locations) {
      prompt += `\n- ${loc.name}`
      if (loc.description) prompt += `: ${loc.description}`
      if (loc.sensoryDetails) prompt += ` | Sensory: ${loc.sensoryDetails}`
      if (loc.emotionalTone) prompt += ` | Tone: ${loc.emotionalTone}`
    }
  }

  if (ctx.scenes?.length > 0) {
    prompt += `\n\nScenes in Current Chapter:`
    for (const scene of ctx.scenes) {
      prompt += `\n- ${scene.title}`
      if (scene.synopsis) prompt += `: ${scene.synopsis}`
      if (scene.povCharacterName) prompt += ` | POV: ${scene.povCharacterName}`
      if (scene.locationName) prompt += ` | Location: ${scene.locationName}`
      if (scene.moodStart || scene.moodEnd) prompt += ` | Mood: ${scene.moodStart ?? "?"} → ${scene.moodEnd ?? "?"}`
    }
  }

  if (ctx.neighboringSynopses?.length > 0) {
    prompt += `\n\nNeighboring Chapters:`
    for (const ch of ctx.neighboringSynopses) {
      prompt += `\n- Chapter ${ch.number} "${ch.title}"`
      if (ch.synopsis) prompt += `: ${ch.synopsis}`
    }
  }

  if (ctx.chapterSynopsis) prompt += `\n\nCurrent Chapter Synopsis: ${ctx.chapterSynopsis}`

  const selectedTextBlock = selectedText
    ? `\n\nThe writer has selected the following text from their manuscript:\n---\n${selectedText}\n---`
    : ""

  switch (command) {
    case "continue":
      if (ctx.currentContent) {
        const lastChunk = ctx.currentContent.slice(-3000)
        const prefix = ctx.currentContent.length > 3000 ? "[...]\n" : ""
        prompt += `\n\nCurrent manuscript text (ending):\n${prefix}${lastChunk}`
      }
      prompt += `\n\nYour task: Continue writing the narrative seamlessly from where the writer left off. Match the established voice, tone, and pacing. Write 200-400 words of new prose that flows naturally. Focus on literary quality, sensory details, and psychological depth.`
      break
    case "deepen":
      prompt += selectedTextBlock
      prompt += `\n\nYour task: Rewrite the provided passage with greater psychological depth and literary richness. Add internal monologue, sensory details, subtext, emotional complexity, and imagery. Maintain the same events but make the prose more layered and literary. Respond with ONLY the rewritten prose — no preamble, no explanation.`
      break
    case "dialogue":
      prompt += selectedTextBlock
      prompt += `\n\nYour task: Generate authentic dialogue for characters in this scene. Each character should have a distinct voice. Focus on subtext, character-specific speech patterns, tension, and natural rhythm. Use action beats between lines. Respond with ONLY the rewritten prose — no preamble, no explanation.`
      break
    case "sensory":
      prompt += selectedTextBlock
      prompt += `\n\nYour task: Enrich the passage with vivid sensory details — visual, auditory, olfactory, tactile, gustatory. Weave them naturally into the prose without overloading. Respond with ONLY the rewritten prose — no preamble, no explanation.`
      break
    case "action":
      prompt += selectedTextBlock
      prompt += `\n\nYour task: Write physical action, movement, and kinetic prose. Focus on body language, choreography, and concrete physical details. Respond with ONLY the rewritten prose — no preamble, no explanation.`
      break
    default:
      if (selectedText) {
        prompt += selectedTextBlock
        prompt += `\n\nThe writer has selected text from their manuscript and may ask you to revise, rephrase, or edit it. If they ask to rewrite, rephrase, or edit the text, respond with ONLY the revised prose — no preamble, no explanation. If they ask a question about the text, respond conversationally. Match the existing voice, tense, POV, and style of the manuscript.`
      } else {
        prompt += `\n\nYou are a thoughtful writing assistant. Help with brainstorming, feedback, plotting, character development, prose critique, or discussion. Be specific and insightful. If asked to write or generate prose, respond with ONLY the prose, ready to insert into the manuscript.`
      }
  }

  // Cap total system prompt to prevent unbounded growth for large books
  if (prompt.length > MAX_CONTEXT_CHARS) {
    prompt = prompt.slice(0, MAX_CONTEXT_CHARS) + "\n\n[Context truncated due to length]"
  }

  return prompt
}

export function buildWriteScenePrompt(ctx: BookContext): string {
  let prompt = buildBaseBookPrompt(ctx)

  prompt += `\n\nYou are an agentic writing assistant with access to tools. Your task is to write the next scene for this book.

Instructions:
1. Use the list_chapters tool to see all chapters and their status.
2. Use get_chapter_content to read the current chapter text.
3. If scenes are defined in the outline, follow them. Otherwise, continue the narrative logically.
4. Write 300-600 words of literary prose that matches the book's voice, style, and tone.
5. Use the insert_text tool to append your prose to the appropriate chapter.
6. Focus on sensory details, psychological depth, character voice, and narrative momentum.

Write prose directly — do not explain what you're doing. Just use the tools and write.`

  return prompt
}

export function buildConsistencyCheckPrompt(ctx: BookContext): string {
  let prompt = buildBaseBookPrompt(ctx)

  prompt += `\n\nYou are an agentic consistency checker for this novel. Your task is to scan chapters for inconsistencies.

Instructions:
1. Use list_chapters to see all chapters.
2. Use get_chapter_content to read each chapter that has content.
3. Use lookup_character and get_character_relationships to verify character details.
4. Check for:
   - Characters referred to by wrong names or with inconsistent descriptions
   - Timeline inconsistencies (events happening in wrong order)
   - Setting inconsistencies (locations described differently)
   - Relationship inconsistencies (characters' relationships contradicting earlier chapters)
   - POV inconsistencies within chapters

Report your findings clearly, organized by chapter, with specific quotes from the text where issues occur. If no inconsistencies are found, say so.`

  return prompt
}

export function buildReviewSuggestPrompt(ctx: BookContext): string {
  let prompt = buildBaseBookPrompt(ctx)

  prompt += `\n\nYou are an agentic literary editor reviewing this chapter. Your task is to provide specific, actionable feedback.

Instructions:
1. Use get_chapter_content to read the current chapter.
2. Use lookup_character to verify character portrayals.
3. Analyze the prose for:
   - Pacing issues (too slow, too fast, uneven)
   - Weak or clichéd prose that could be strengthened
   - Dialogue that doesn't sound authentic to the character
   - Missed opportunities for sensory detail or subtext
   - Paragraphs that could be cut or condensed

Provide 3-5 specific suggestions with exact quotes from the text and proposed improvements. Be constructive and specific — cite line-level examples.`

  return prompt
}

function buildBaseBookPrompt(ctx: BookContext): string {
  let prompt = `You are a literary fiction writing assistant for the novel "${ctx.title}".
Genre: ${ctx.genre ?? "Literary Fiction"}.`

  if (ctx.premise) prompt += `\nPremise: ${ctx.premise}`
  if (ctx.styleGuide) prompt += `\n\nStyle Guide: ${ctx.styleGuide}`

  if (ctx.characters.length > 0) {
    prompt += `\n\nKey Characters:`
    for (const char of ctx.characters) {
      prompt += `\n- ${char.name}`
      if (char.role) prompt += ` (${char.role})`
    }
  }

  if (ctx.locations?.length > 0) {
    prompt += `\n\nLocations:`
    for (const loc of ctx.locations) {
      prompt += `\n- ${loc.name}`
    }
  }

  if (ctx.chapterSynopsis) prompt += `\n\nCurrent Chapter Synopsis: ${ctx.chapterSynopsis}`

  return prompt
}
