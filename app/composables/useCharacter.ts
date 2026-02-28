import type { Character, CreateCharacterInput, UpdateCharacterInput } from '~~/shared/types'

const { useList, useOne, create, update, remove } = createResourceComposable<CreateCharacterInput, UpdateCharacterInput, Character>(
  '/api/characters',
  { parentQueryParam: 'bookId' },
)

export function useCharacters(bookId: MaybeRef<string>) { return useList(bookId) }
export function useCharacter(id: MaybeRef<string>) { return useOne(id) }
export function createCharacter(input: CreateCharacterInput) { return create(input) }
export function updateCharacter(id: string, input: UpdateCharacterInput) { return update(id, input) }
export function deleteCharacter(id: string) { return remove(id) }
