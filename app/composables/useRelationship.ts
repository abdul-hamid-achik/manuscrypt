import type { CharacterRelationship, CreateCharacterRelationshipInput, UpdateCharacterRelationshipInput } from '~~/shared/types'

const { useList, create, update, remove } = createResourceComposable<CreateCharacterRelationshipInput, UpdateCharacterRelationshipInput, CharacterRelationship>(
  '/api/relationships',
  { parentQueryParam: 'bookId' },
)

export const useRelationships = (bookId: MaybeRef<string>) => useList(bookId)
export const createRelationship = (data: CreateCharacterRelationshipInput) => create(data)
export const updateRelationship = (id: string, data: UpdateCharacterRelationshipInput) => update(id, data)
export const deleteRelationship = (id: string) => remove(id)
