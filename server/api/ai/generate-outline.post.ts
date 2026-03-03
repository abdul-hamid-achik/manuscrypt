import { createAnthropicClient, callAnthropicJson } from "../../utils/ai-stream"
import { buildBookContext } from "../../utils/ai-prompts"
import { checkRateLimit } from "../../utils/rate-limit"
import { generateOutlineSchema } from "../../utils/validation"
import { db, sqlite } from "../../database"
import { chapters, scenes, characters, locations } from "../../database/schema"
import { eq } from "drizzle-orm"

interface OutlineScene {
  title: string
  synopsis?: string
  povCharacterName?: string
  locationName?: string
  moodStart?: string
  moodEnd?: string
}

interface OutlineChapter {
  number: number
  title: string
  synopsis?: string
  act: number
  scenes: OutlineScene[]
}

interface GeneratedOutline {
  chapters: OutlineChapter[]
}

export default defineEventHandler(async (event) => {
  checkRateLimit(event, { maxRequests: 5, windowMs: 60_000 })

  const body = await readBody(event)
  const { bookId } = generateOutlineSchema.parse(body)

  const bookContext = buildBookContext(bookId)

  // Build character and location name-to-ID maps for resolving references
  const bookCharacters = db.select().from(characters).where(eq(characters.bookId, bookId)).all()
  const bookLocations = db.select().from(locations).where(eq(locations.bookId, bookId)).all()
  const charNameMap = new Map(bookCharacters.map((c) => [c.name.toLowerCase(), c.id]))
  const locationNameMap = new Map(bookLocations.map((l) => [l.name.toLowerCase(), l.id]))

  const characterList = bookCharacters.map((c) => `- ${c.name}${c.role ? ` (${c.role})` : ""}`).join("\n")
  const locationList = bookLocations.map((l) => `- ${l.name}`).join("\n")

  const systemPrompt = `You are a novel outline generator. Generate a detailed 3-act outline structure for the novel "${bookContext.title}".

Genre: ${bookContext.genre ?? "Literary Fiction"}
${bookContext.premise ? `Premise: ${bookContext.premise}` : ""}
${characterList ? `\nAvailable Characters:\n${characterList}` : ""}
${locationList ? `\nAvailable Locations:\n${locationList}` : ""}

Generate a compelling outline with chapters distributed across 3 acts:
- Act 1 (Setup): ~25% of chapters — introduce characters, world, and inciting incident
- Act 2 (Confrontation): ~50% of chapters — rising action, complications, midpoint reversal
- Act 3 (Resolution): ~25% of chapters — climax, falling action, resolution

For each chapter, create 2-4 scenes with titles, synopses, and optional POV character/location references.

IMPORTANT: When referencing characters or locations, use their exact names from the lists above.

Respond with ONLY valid JSON matching this structure:
{
  "chapters": [
    {
      "number": 1,
      "title": "Chapter Title",
      "synopsis": "Brief chapter summary",
      "act": 1,
      "scenes": [
        {
          "title": "Scene Title",
          "synopsis": "Scene summary",
          "povCharacterName": "Character Name",
          "locationName": "Location Name",
          "moodStart": "tense",
          "moodEnd": "hopeful"
        }
      ]
    }
  ]
}`

  const anthropic = createAnthropicClient()
  const config = useRuntimeConfig()

  const outline = await callAnthropicJson<GeneratedOutline>(anthropic, {
    model: config.anthropicSmartModel,
    maxTokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: "Generate the outline now." }],
    errorLabel: "Outline generation",
  })

  if (!outline.chapters || !Array.isArray(outline.chapters)) {
    throw createError({ statusCode: 502, message: "AI returned invalid outline structure" })
  }

  // Create chapters and scenes in a transaction
  const createdChapters: Array<{ id: string; number: number; title: string; act: number }> = []

  const insertAll = sqlite.transaction(() => {
    for (const ch of outline.chapters) {
      const chapterId = crypto.randomUUID()

      db.insert(chapters)
        .values({
          id: chapterId,
          bookId,
          number: ch.number,
          title: ch.title,
          synopsis: ch.synopsis ?? null,
          act: ch.act,
          sortOrder: ch.number,
          status: "planned",
        })
        .run()

      createdChapters.push({ id: chapterId, number: ch.number, title: ch.title, act: ch.act })

      // Create scenes for this chapter
      if (ch.scenes && Array.isArray(ch.scenes)) {
        for (let i = 0; i < ch.scenes.length; i++) {
          const sc = ch.scenes[i]!
          const povCharacterId = sc.povCharacterName
            ? charNameMap.get(sc.povCharacterName.toLowerCase()) ?? null
            : null
          const locationId = sc.locationName
            ? locationNameMap.get(sc.locationName.toLowerCase()) ?? null
            : null

          db.insert(scenes)
            .values({
              id: crypto.randomUUID(),
              chapterId,
              title: sc.title,
              synopsis: sc.synopsis ?? null,
              povCharacterId,
              locationId,
              moodStart: sc.moodStart ?? null,
              moodEnd: sc.moodEnd ?? null,
              sortOrder: i,
              status: "planned",
            })
            .run()
        }
      }
    }
  })

  insertAll()

  return { chapters: createdChapters }
})
