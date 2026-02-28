import type { CharacterRelationship, CreateCharacterRelationshipInput, UpdateCharacterRelationshipInput } from '~~/shared/types'

const { useList, create, update, remove } = createResourceComposable<CreateCharacterRelationshipInput, UpdateCharacterRelationshipInput, CharacterRelationship>(
  '/api/relationships',
  { parentQueryParam: 'bookId' },
)

export function useRelationships(bookId: MaybeRef<string>) { return useList(bookId) }
export function createRelationship(input: CreateCharacterRelationshipInput) { return create(input) }
export function updateRelationship(id: string, input: UpdateCharacterRelationshipInput) { return update(id, input) }
export function deleteRelationship(id: string) { return remove(id) }
