export const CHAPTER_STATUSES = ['planned', 'outlined', 'drafting', 'revising', 'done'] as const
export type ChapterStatus = typeof CHAPTER_STATUSES[number]

export interface TipTapNode {
  type: string
  text?: string
  attrs?: Record<string, any>
  marks?: Array<{ type: string; attrs?: Record<string, any> }>
  content?: TipTapNode[]
}

export interface Book {
  id: string
  title: string
  genre: string | null
  premise: string | null
  targetWordCount: number | null
  status: string | null
  styleGuide: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface Chapter {
  id: string
  bookId: string
  number: number
  title: string
  synopsis: string | null
  content: string | null
  wordCount: number | null
  status: string | null
  act: number | null
  sortOrder: number
  createdAt: string | null
  updatedAt: string | null
}

export interface Scene {
  id: string
  chapterId: string
  title: string
  synopsis: string | null
  povCharacterId: string | null
  locationId: string | null
  moodStart: string | null
  moodEnd: string | null
  targetWordCount: number | null
  status: string | null
  sortOrder: number
  createdAt: string | null
}

export interface Character {
  id: string
  bookId: string
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
  createdAt: string | null
  updatedAt: string | null
}

export interface CharacterRelationship {
  id: string
  bookId: string
  fromCharacterId: string
  toCharacterId: string
  relationshipType: string
  description: string | null
}

export interface Location {
  id: string
  bookId: string
  name: string
  description: string | null
  sensoryDetails: string | null
  emotionalTone: string | null
  createdAt: string | null
}

export interface AiMessage {
  id: string
  bookId: string
  chapterId: string | null
  characterId: string | null
  role: string
  content: string
  command: string | null
  createdAt: string | null
}

export interface WritingSession {
  id: string
  bookId: string
  chapterId: string | null
  wordsWritten: number | null
  duration: number | null
  startedAt: string | null
  endedAt: string | null
}

export interface BookStats {
  totalWords: number
  totalChapters: number
  totalCharacters: number
  completionPercentage: number
}

export interface CreateBookInput {
  title: string
  genre?: string
  premise?: string
  targetWordCount?: number
  styleGuide?: string
}

export interface UpdateBookInput {
  title?: string
  genre?: string
  premise?: string
  targetWordCount?: number
  status?: string
  styleGuide?: string
}

export interface CreateChapterInput {
  bookId: string
  number: number
  title: string
  synopsis?: string
  act?: number
  sortOrder: number
}

export interface UpdateChapterInput {
  title?: string
  synopsis?: string
  content?: string
  wordCount?: number
  status?: string
  act?: number
  sortOrder?: number
}

export interface CreateSceneInput {
  chapterId: string
  title: string
  synopsis?: string
  povCharacterId?: string
  locationId?: string
  moodStart?: string
  moodEnd?: string
  targetWordCount?: number
  sortOrder: number
}

export interface UpdateSceneInput {
  title?: string
  synopsis?: string
  povCharacterId?: string
  locationId?: string
  moodStart?: string
  moodEnd?: string
  targetWordCount?: number
  status?: string
  sortOrder?: number
}

export interface CreateCharacterInput {
  bookId: string
  name: string
  role?: string
  age?: string
  archetype?: string
  description?: string
  motivation?: string
  fear?: string
  contradiction?: string
  voiceNotes?: string
  traits?: string
  backstory?: string
}

export interface UpdateCharacterInput {
  name?: string
  role?: string
  age?: string
  archetype?: string
  description?: string
  motivation?: string
  fear?: string
  contradiction?: string
  voiceNotes?: string
  traits?: string
  backstory?: string
}

export interface CreateLocationInput {
  bookId: string
  name: string
  description?: string
  sensoryDetails?: string
  emotionalTone?: string
}

export interface UpdateLocationInput {
  name?: string
  description?: string
  sensoryDetails?: string
  emotionalTone?: string
}

export interface CreateCharacterRelationshipInput {
  bookId: string
  fromCharacterId: string
  toCharacterId: string
  relationshipType: string
  description?: string
}

export interface UpdateCharacterRelationshipInput {
  relationshipType?: string
  description?: string
}

export interface CreateAiMessageInput {
  bookId: string
  chapterId?: string
  characterId?: string
  role: string
  content: string
  command?: string
}

export interface CreateWritingSessionInput {
  bookId: string
  chapterId?: string
}

export interface UpdateWritingSessionInput {
  wordsWritten?: number
  duration?: number
  endedAt?: string
}
