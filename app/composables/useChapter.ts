import type { Chapter, CreateChapterInput, UpdateChapterInput } from '~~/shared/types'

const { useList, useOne, create, update, remove } = createResourceComposable<CreateChapterInput, UpdateChapterInput, Chapter>(
  '/api/chapters',
  { parentQueryParam: 'bookId' },
)

export const useChapters = (bookId: MaybeRef<string>) => useList(bookId)
export const useChapter = (id: MaybeRef<string>) => useOne(id)
export const createChapter = (data: CreateChapterInput) => create(data)
export const updateChapter = (id: string, data: UpdateChapterInput) => update(id, data)
export const deleteChapter = (id: string) => remove(id)

export async function reorderChapter(id: string, newOrder: number) {
  return $fetch(`/api/chapters/${id}/reorder`, {
    method: 'PUT',
    body: { newOrder },
  })
}
