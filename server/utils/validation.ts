import { z } from "zod"
import { CHAPTER_STATUSES } from "~~/shared/types"

const BOOK_STATUSES = ["planning", "outlining", "drafting", "revising", "done"] as const
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
  act: z.number().int().min(1).max(5).optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export const updateChapterSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  synopsis: z.string().max(10_000).nullable().optional(),
  content: z.string().max(5_000_000).nullable().optional(),
  wordCount: z.number().int().min(0).optional(),
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
})

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
