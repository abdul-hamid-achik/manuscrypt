import { z } from "zod"
import { BOOK_STATUSES, CHAPTER_STATUSES } from "~~/shared/types"
const SCENE_STATUSES = CHAPTER_STATUSES

// ── Books ──
export const createBookSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  genre: z.string().max(200).optional(),
  premise: z.string().max(10_000).optional(),
  targetWordCount: z.number().int().min(0).max(10_000_000).optional(),
  styleGuide: z.string().max(50_000).optional(),
})

export const updateBookSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  genre: z.string().max(200).nullable().optional(),
  premise: z.string().max(10_000).nullable().optional(),
  targetWordCount: z.number().int().min(0).max(10_000_000).optional(),
  status: z.enum(BOOK_STATUSES).optional(),
  styleGuide: z.string().max(50_000).nullable().optional(),
})

// ── Chapters ──
export const createChapterSchema = z.object({
  bookId: z.string().min(1, "bookId is required"),
  number: z.number().int().min(1).optional(),
  title: z.string().max(500).optional(),
  synopsis: z.string().max(10_000).optional(),
  content: z.string().max(5_000_000).optional(),
  targetWordCount: z.number().int().min(0).max(1_000_000).optional(),
  act: z.number().int().min(1).max(5).optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export const updateChapterSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  synopsis: z.string().max(10_000).nullable().optional(),
  content: z.string().max(5_000_000).nullable().optional(),
  wordCount: z.number().int().min(0).optional(),
  targetWordCount: z.number().int().min(0).max(1_000_000).nullable().optional(),
  status: z.enum(CHAPTER_STATUSES).optional(),
  act: z.number().int().min(1).max(5).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

// ── Characters ──
export const createCharacterSchema = z.object({
  bookId: z.string().min(1, "bookId is required"),
  name: z.string().min(1, "Name is required").max(500),
  role: z.string().max(200).optional(),
  age: z.string().max(100).optional(),
  archetype: z.string().max(200).optional(),
  description: z.string().max(10_000).optional(),
  motivation: z.string().max(5_000).optional(),
  fear: z.string().max(5_000).optional(),
  contradiction: z.string().max(5_000).optional(),
  voiceNotes: z.string().max(10_000).optional(),
  traits: z.string().max(2_000).optional(),
  backstory: z.string().max(50_000).optional(),
})

export const updateCharacterSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  role: z.string().max(200).nullable().optional(),
  age: z.string().max(100).nullable().optional(),
  archetype: z.string().max(200).nullable().optional(),
  description: z.string().max(10_000).nullable().optional(),
  motivation: z.string().max(5_000).nullable().optional(),
  fear: z.string().max(5_000).nullable().optional(),
  contradiction: z.string().max(5_000).nullable().optional(),
  voiceNotes: z.string().max(10_000).nullable().optional(),
  traits: z.string().max(2_000).nullable().optional(),
  backstory: z.string().max(50_000).nullable().optional(),
})

// ── Scenes ──
export const createSceneSchema = z.object({
  chapterId: z.string().min(1, "chapterId is required"),
  title: z.string().min(1, "Title is required").max(500),
  synopsis: z.string().max(10_000).optional(),
  povCharacterId: z.string().optional(),
  locationId: z.string().optional(),
  moodStart: z.string().max(200).optional(),
  moodEnd: z.string().max(200).optional(),
  targetWordCount: z.number().int().min(0).max(1_000_000).optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export const updateSceneSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  synopsis: z.string().max(10_000).nullable().optional(),
  povCharacterId: z.string().nullable().optional(),
  locationId: z.string().nullable().optional(),
  moodStart: z.string().max(200).nullable().optional(),
  moodEnd: z.string().max(200).nullable().optional(),
  targetWordCount: z.number().int().min(0).max(1_000_000).nullable().optional(),
  status: z.enum(SCENE_STATUSES).optional(),
  sortOrder: z.number().int().min(0).optional(),
})

// ── Locations ──
export const createLocationSchema = z.object({
  bookId: z.string().min(1, "bookId is required"),
  name: z.string().min(1, "Name is required").max(500),
  description: z.string().max(10_000).optional(),
  sensoryDetails: z.string().max(10_000).optional(),
  emotionalTone: z.string().max(500).optional(),
})

export const updateLocationSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  description: z.string().max(10_000).nullable().optional(),
  sensoryDetails: z.string().max(10_000).nullable().optional(),
  emotionalTone: z.string().max(500).nullable().optional(),
})

// ── Relationships ──
export const createRelationshipSchema = z.object({
  bookId: z.string().min(1, "bookId is required"),
  fromCharacterId: z.string().min(1, "fromCharacterId is required"),
  toCharacterId: z.string().min(1, "toCharacterId is required"),
  relationshipType: z.string().min(1, "relationshipType is required").max(200),
  description: z.string().max(5_000).optional(),
}).refine(
  (data) => data.fromCharacterId !== data.toCharacterId,
  { message: "A character cannot have a relationship with itself", path: ["toCharacterId"] },
)

export const updateRelationshipSchema = z.object({
  relationshipType: z.string().min(1).max(200).optional(),
  description: z.string().max(5_000).nullable().optional(),
})

// ── Writing Sessions ──
export const createWritingSessionSchema = z.object({
  bookId: z.string().min(1, "bookId is required"),
  chapterId: z.string().optional(),
  wordsWritten: z.number().int().min(0).optional(),
  duration: z.number().int().min(0).optional(),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
})

export const flushWritingSessionSchema = z.object({
  id: z.string().optional(),
  bookId: z.string().min(1, "bookId is required"),
  chapterId: z.string().optional(),
  wordsWritten: z.number().int().min(0).optional(),
  duration: z.number().int().min(0).optional(),
  startedAt: z.string().optional(),
  endedAt: z.string().min(1).optional(),
})

// ── Content Snapshots ──
export const createSnapshotSchema = z.object({
  chapterId: z.string().min(1, "chapterId is required"),
  content: z.string().min(1, "content is required").max(5_000_000),
  wordCount: z.number().int().min(0).default(0),
  label: z.string().max(500).optional(),
})

// ── AI Endpoints ──
export const aiStreamSchema = z.object({
  bookId: z.string(),
  chapterId: z.string().optional(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ),
  command: z.string().optional(),
  selectedText: z.string().optional(),
  agentMode: z.boolean().optional(),
})

export const aiReviewSchema = z.object({
  chapterId: z.string(),
})

export const aiInterviewSchema = z.object({
  bookId: z.string(),
  characterId: z.string(),
  message: z.string().min(1, "message must not be empty"),
  history: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ),
})

export const aiStyleAnalyzeSchema = z.object({
  text: z.string().min(100, "Please provide at least 100 characters of text to analyze").max(50000, "Text must not exceed 50,000 characters"),
  bookId: z.string().optional(),
})

export const aiMessageSchema = z.object({
  bookId: z.string().min(1),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1, "content must not be empty").max(100_000),
  chapterId: z.string().optional(),
  characterId: z.string().optional(),
  command: z.string().max(100).optional(),
})

// ── AI Outline Generation ──
const outlineSceneSchema = z.object({
  title: z.string().min(1).max(500),
  synopsis: z.string().max(10_000).optional(),
  povCharacterName: z.string().max(500).optional(),
  locationName: z.string().max(500).optional(),
  moodStart: z.string().max(200).optional(),
  moodEnd: z.string().max(200).optional(),
})

const outlineChapterSchema = z.object({
  number: z.number().int().min(1, "Chapter number must be at least 1"),
  title: z.string().min(1).max(500),
  synopsis: z.string().max(10_000).optional(),
  act: z.number().int().min(1).max(5),
  scenes: z.array(outlineSceneSchema).optional(),
})

const outlinePayloadSchema = z.object({
  chapters: z.array(outlineChapterSchema),
})

export const generateOutlineSchema = z.object({
  bookId: z.string().min(1, "bookId is required"),
  mode: z.enum(["preview", "append", "replace"]).default("append"),
  outline: outlinePayloadSchema.optional(),
})

// ── Export ──
export const exportSchema = z.object({
  bookId: z.string().min(1, "bookId is required"),
})

// ── Reorder ──
export const reorderSchema = z.object({
  newOrder: z.number().int().min(0, "newOrder must be >= 0"),
})

// ── Writing Session Update ──
export const updateWritingSessionSchema = z.object({
  wordsWritten: z.number().int().min(0).optional(),
  duration: z.number().int().min(0).optional(),
  endedAt: z.string().optional(),
})

// ── Helpers ──
export function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: `Invalid input: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
    })
  }
  return parsed.data
}
