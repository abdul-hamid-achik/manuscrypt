import { db } from "../database"
import { books, chapters, characters, locations, characterRelationships, scenes } from "../database/schema"
import { eq, and, lt, gt, asc, desc } from "drizzle-orm"
import { tiptapJsonToText } from "./tiptap"

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
  let neighboringSynopses: BookContext["neighboringSynopses"] = []

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
    for (const char of ctx.characters) {
      prompt += `\n- ${char.name}`
      if (char.role) prompt += ` (${char.role})`
      if (char.age) prompt += `, age ${char.age}`
      if (char.archetype) prompt += ` [${char.archetype}]`
      if (char.description) prompt += `: ${char.description}`
      if (char.motivation) prompt += ` | Motivation: ${char.motivation}`
      if (char.fear) prompt += ` | Fear: ${char.fear}`
      if (char.contradiction) prompt += ` | Internal conflict: ${char.contradiction}`
      if (char.traits) prompt += ` | Traits: ${char.traits}`
      if (char.backstory) prompt += ` | Backstory: ${char.backstory}`
      if (char.voiceNotes) prompt += ` | Voice: ${char.voiceNotes}`
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
    default:
      if (selectedText) {
        prompt += selectedTextBlock
        prompt += `\n\nThe writer has selected text from their manuscript and may ask you to revise, rephrase, or edit it. If they ask to rewrite, rephrase, or edit the text, respond with ONLY the revised prose — no preamble, no explanation. If they ask a question about the text, respond conversationally. Match the existing voice, tense, POV, and style of the manuscript.`
      } else {
        prompt += `\n\nYou are a thoughtful writing assistant. Help with brainstorming, feedback, plotting, character development, prose critique, or discussion. Be specific and insightful. If asked to write or generate prose, respond with ONLY the prose, ready to insert into the manuscript.`
      }
  }

  return prompt
}
