import { createAnthropicClient, callAnthropicJson } from "../../utils/ai-stream"
import { buildBookContext } from "../../utils/ai-prompts"
import { checkRateLimit } from "../../utils/rate-limit"
import { generateOutlineSchema, parseBody } from "../../utils/validation"
import { db, sqlite } from "../../database"
import { chapters, scenes, characters, locations } from "../../database/schema"
import { eq, max, sql } from "drizzle-orm"

interface GeneratedSceneInput {
  title: string
  synopsis?: string
  povCharacterName?: string
  locationName?: string
  moodStart?: string
  moodEnd?: string
}

interface GeneratedChapterInput {
  number: number
  title: string
  synopsis?: string
  act: number
  scenes?: GeneratedSceneInput[]
}

interface OutlinePayload {
  chapters: GeneratedChapterInput[]
}

interface UnresolvedScene {
  title: string
  synopsis: string | null
  moodStart: string | null
  moodEnd: string | null
  povCharacterName?: string
  locationName?: string
}

interface UnresolvedChapter {
  number: number
  title: string
  synopsis: string | null
  act: number
  scenes: UnresolvedScene[]
}

interface ResolvedScene {
  title: string
  synopsis: string | null
  moodStart: string | null
  moodEnd: string | null
  povCharacterId: string | null
  locationId: string | null
}

interface ResolvedChapter {
  number: number
  title: string
  synopsis: string | null
  act: number
  scenes: ResolvedScene[]
}

interface ChapterInsertPlan extends ResolvedChapter {
  id: string
  sortOrder: number
}

interface ExistingOutlineSummary {
  chapterCount: number
  maxNumber: number | null
  maxSortOrder: number | null
}

function toUnresolvedChapters(chapters: GeneratedChapterInput[]): UnresolvedChapter[] {
  const normalized = chapters
    .map((chapter, sourceIndex) => {
      const number = Number.isFinite(chapter.number) ? Math.max(1, Math.floor(chapter.number)) : 0
      const title = chapter.title?.trim()
      const act = Number.isFinite(chapter.act) ? Math.max(1, Math.min(5, Math.floor(chapter.act))) : 1
      if (!number || !title) return null

      const scenes = (chapter.scenes ?? [])
        .map((scene) => {
          const sceneTitle = scene.title?.trim()
          if (!sceneTitle) return null

          return {
            title: sceneTitle,
            synopsis: scene.synopsis?.trim() ?? null,
            moodStart: scene.moodStart?.trim() ?? null,
            moodEnd: scene.moodEnd?.trim() ?? null,
            povCharacterName: scene.povCharacterName?.trim().toLowerCase(),
            locationName: scene.locationName?.trim().toLowerCase(),
            sourceIndex,
          }
        })
        .filter(
          (scene): scene is {
            title: string
            synopsis: string | null
            moodStart: string | null
            moodEnd: string | null
            povCharacterName?: string
            locationName?: string
            sourceIndex: number
          } => Boolean(scene),
        )

      return {
        number,
        title,
        synopsis: chapter.synopsis?.trim() ?? null,
        act,
        scenes,
        sourceIndex,
      }
    })
    .filter(
      (chapter): chapter is UnresolvedChapter & { sourceIndex: number } => Boolean(chapter),
    )
    .sort((a, b) => {
      if (a.number === b.number) return a.sourceIndex - b.sourceIndex
      return a.number - b.number
    })

  const seenNumbers = new Set<number>()
  const unique: UnresolvedChapter[] = []

  for (const chapter of normalized) {
    if (seenNumbers.has(chapter.number)) continue
    seenNumbers.add(chapter.number)
    unique.push({
      number: chapter.number,
      title: chapter.title,
      synopsis: chapter.synopsis,
      act: chapter.act,
      scenes: chapter.scenes.map((scene) => ({
        title: scene.title,
        synopsis: scene.synopsis,
        moodStart: scene.moodStart,
        moodEnd: scene.moodEnd,
        povCharacterName: scene.povCharacterName,
        locationName: scene.locationName,
      })),
    })
  }

  return unique
}

function toResolvedChapters(
  unresolved: UnresolvedChapter[],
  charNameMap: Map<string, string>,
  locationNameMap: Map<string, string>,
): ResolvedChapter[] {
  return unresolved.map((chapter) => ({
    number: chapter.number,
    title: chapter.title,
    synopsis: chapter.synopsis,
    act: chapter.act,
    scenes: chapter.scenes.map((scene) => ({
      title: scene.title,
      synopsis: scene.synopsis,
      moodStart: scene.moodStart,
      moodEnd: scene.moodEnd,
      povCharacterId: scene.povCharacterName
        ? charNameMap.get(scene.povCharacterName) ?? null
        : null,
      locationId: scene.locationName
        ? locationNameMap.get(scene.locationName) ?? null
        : null,
    })),
  }))
}

function buildInsertPlan(
  outline: ResolvedChapter[],
  mode: "preview" | "append" | "replace",
  existing: ExistingOutlineSummary,
): ChapterInsertPlan[] {
  const isAppending = mode === "append" && (existing.chapterCount ?? 0) > 0
  const startNumber = (existing.maxNumber ?? 0) + 1
  const startSortOrder = existing.maxSortOrder ?? 0
  const nextSortOrder = startSortOrder % 10 === 0 ? startSortOrder : Math.ceil(startSortOrder / 10) * 10

  return outline.map((chapter, index) => ({
    id: crypto.randomUUID(),
    number: isAppending ? startNumber + index : chapter.number,
    title: chapter.title,
    synopsis: chapter.synopsis,
    act: chapter.act,
    scenes: chapter.scenes,
    sortOrder: isAppending
      ? nextSortOrder + (index + 1) * 10
      : (index + 1) * 10,
  }))
}

export default defineEventHandler(async (event) => {
  checkRateLimit(event, { maxRequests: 5, windowMs: 60_000 })

  const body = await readBody(event)
  const { bookId, mode, outline } = parseBody(generateOutlineSchema, body)
  const bookContext = buildBookContext(bookId)

  const existing = db
    .select({
      chapterCount: sql<number>`count(*)`,
      maxNumber: max(chapters.number),
      maxSortOrder: max(chapters.sortOrder),
    })
    .from(chapters)
    .where(eq(chapters.bookId, bookId))
    .get() as ExistingOutlineSummary

  const hasExisting = (existing?.chapterCount ?? 0) > 0

  const shouldApply = mode === "append" || mode === "replace"

  async function buildOutline(): Promise<ResolvedChapter[]> {
    const outlinePayload: OutlinePayload | null = outline ? { chapters: outline.chapters } : null

    const bookCharacters = db.select().from(characters).where(eq(characters.bookId, bookId)).all()
    const bookLocations = db.select().from(locations).where(eq(locations.bookId, bookId)).all()
    const charNameMap = new Map(bookCharacters.map((c) => [c.name.toLowerCase(), c.id]))
    const locationNameMap = new Map(bookLocations.map((l) => [l.name.toLowerCase(), l.id]))

    if (outlinePayload?.chapters?.length) {
      const unresolved = toUnresolvedChapters(outlinePayload.chapters)
      return toResolvedChapters(unresolved, charNameMap, locationNameMap)
    }

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

    const aiOutline = await callAnthropicJson<{ chapters: GeneratedChapterInput[] }>(
      anthropic,
      {
        model: config.anthropicSmartModel,
        maxTokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: "Generate the outline now." }],
        errorLabel: "Outline generation",
      },
    )

    if (!aiOutline.chapters || !Array.isArray(aiOutline.chapters)) {
      throw createError({ statusCode: 502, message: "AI returned invalid outline structure" })
    }

    const unresolved = toUnresolvedChapters(aiOutline.chapters)
    return toResolvedChapters(unresolved, charNameMap, locationNameMap)
  }

  const resolvedOutline = await buildOutline()
  const existingMaxNumber = Number(existing.maxNumber ?? 0)

  const collisionsWithExisting = hasExisting && mode === "append" && resolvedOutline.some((chapter) => chapter.number <= existingMaxNumber)

  const warnings: string[] = []
  if (collisionsWithExisting) {
    warnings.push("Generated chapter numbering overlapped with existing chapters. Numbers were adjusted automatically during apply.")
  }

  if (!shouldApply) {
    return {
      action: "preview",
      mode,
      chapters: resolvedOutline,
      warnings,
    }
  }

  const applied = sqlite.transaction(() => {
    if (mode === "replace" && hasExisting) {
      db.delete(chapters).where(eq(chapters.bookId, bookId)).run()
    }

    const created: Array<{ id: string; number: number; title: string; act: number; scenes: number }> = []

    for (const chapter of buildInsertPlan(resolvedOutline, mode, existing)) {
      db.insert(chapters)
        .values({
          id: chapter.id,
          bookId,
          number: chapter.number,
          title: chapter.title,
          synopsis: chapter.synopsis,
          act: chapter.act,
          sortOrder: chapter.sortOrder,
          status: "planned",
        })
        .run()

      created.push({
        id: chapter.id,
        number: chapter.number,
        title: chapter.title,
        act: chapter.act,
        scenes: chapter.scenes.length,
      })

      for (const [sceneIndex, scene] of chapter.scenes.entries()) {
        db.insert(scenes)
          .values({
            id: crypto.randomUUID(),
            chapterId: chapter.id,
            title: scene.title,
            synopsis: scene.synopsis,
            povCharacterId: scene.povCharacterId,
            locationId: scene.locationId,
            moodStart: scene.moodStart,
            moodEnd: scene.moodEnd,
            sortOrder: (sceneIndex + 1) * 10,
            status: "planned",
          })
          .run()
      }
    }

    return created
  })

  return {
    action: "applied",
    mode,
    chapterCount: applied.length,
    chapters: applied,
    warnings,
  }
})
