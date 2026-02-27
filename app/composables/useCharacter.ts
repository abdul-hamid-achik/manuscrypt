import type { Character, CreateCharacterInput, UpdateCharacterInput } from '~~/shared/types'

const { useList, useOne, create, update, remove } = createResourceComposable<CreateCharacterInput, UpdateCharacterInput, Character>(
  '/api/characters',
  { parentQueryParam: 'bookId' },
)

export const useCharacters = (bookId: MaybeRef<string>) => useList(bookId)
export const useCharacter = (id: MaybeRef<string>) => useOne(id)
export const createCharacter = (data: CreateCharacterInput) => create(data)
export const updateCharacter = (id: string, data: UpdateCharacterInput) => update(id, data)
export const deleteCharacter = (id: string) => remove(id)
