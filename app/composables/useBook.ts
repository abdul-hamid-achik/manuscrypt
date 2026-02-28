import type { Book, CreateBookInput, UpdateBookInput } from '~~/shared/types'

const { useList, useOne, create, update, remove } = createResourceComposable<CreateBookInput, UpdateBookInput, Book>('/api/books')

export function useBooks() { return useList() }
export function useBook(id: MaybeRef<string>) { return useOne(id) }
export function createBook(input: CreateBookInput) { return create(input) }
export function updateBook(id: string, input: UpdateBookInput) { return update(id, input) }
export function deleteBook(id: string) { return remove(id) }
