import type { Book, CreateBookInput, UpdateBookInput } from '~~/shared/types'

const { useList, useOne, create, update, remove } = createResourceComposable<CreateBookInput, UpdateBookInput, Book>('/api/books')

export const useBooks = () => useList()
export const useBook = (id: MaybeRef<string>) => useOne(id)
export const createBook = (data: CreateBookInput) => create(data)
export const updateBook = (id: string, data: UpdateBookInput) => update(id, data)
export const deleteBook = (id: string) => remove(id)
