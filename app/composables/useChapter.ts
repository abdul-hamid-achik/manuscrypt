import type { Chapter, CreateChapterInput, UpdateChapterInput } from '~~/shared/types'

const { useList, useOne, create, update, remove } = createResourceComposable<CreateChapterInput, UpdateChapterInput, Chapter>(
  '/api/chapters',
  { parentQueryParam: 'bookId' },
)

export function useChapters(bookId: MaybeRef<string>) { return useList(bookId) }
export function useChapter(id: MaybeRef<string>) { return useOne(id) }
export function createChapter(input: CreateChapterInput) { return create(input) }
export function updateChapter(id: string, input: UpdateChapterInput) { return update(id, input) }
export function deleteChapter(id: string) { return remove(id) }

export async function reorderChapter(id: string, newOrder: number) {
  return $fetch(`/api/chapters/${id}/reorder` as string, {
    method: 'PUT',
    body: { newOrder },
  })
}
