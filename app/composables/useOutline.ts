import type { Chapter, Scene, CreateChapterInput, CreateSceneInput, UpdateSceneInput } from '~~/shared/types'

export function useOutline(bookId: MaybeRef<string>) {
  const { data: chapters, refresh: refreshChapters, status } = useChapters(bookId)

  const chaptersByAct = computed(() => {
    const acts: Record<number, Chapter[]> = { 1: [], 2: [], 3: [] }
    if (!chapters.value) return acts
    for (const ch of chapters.value) {
      const act = ch.act ?? 1
      if (!acts[act]) acts[act] = []
      acts[act].push(ch)
    }
    // Sort within each act by sortOrder
    for (const act of Object.keys(acts)) {
      acts[Number(act)]!.sort((a, b) => a.sortOrder - b.sortOrder)
    }
    return acts
  })

  const totalWordCount = computed(() => {
    if (!chapters.value) return 0
    return chapters.value.reduce((sum, ch) => sum + (ch.wordCount ?? 0), 0)
  })

  const totalChapters = computed(() => chapters.value?.length ?? 0)

  async function addChapter(act: number) {
    const actChapters = chaptersByAct.value[act] ?? []
    const maxSort = chapters.value?.reduce((max, ch) => Math.max(max, ch.sortOrder), 0) ?? 0
    const nextNumber = (chapters.value?.length ?? 0) + 1

    await createChapter({
      bookId: toValue(bookId),
      number: nextNumber,
      title: `Chapter ${nextNumber}`,
      act,
      sortOrder: maxSort + 1,
    })
    await refreshChapters()
  }

  async function removeChapter(id: string) {
    await deleteChapter(id)
    await refreshChapters()
  }

  async function moveChapter(id: string, direction: 'up' | 'down') {
    if (!chapters.value) return
    const sorted = [...chapters.value].sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = sorted.findIndex(ch => ch.id === id)
    if (idx === -1) return

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const current = sorted[idx]!
    const swap = sorted[swapIdx]!

    await Promise.all([
      reorderChapter(current.id, swap.sortOrder),
      reorderChapter(swap.id, current.sortOrder),
    ])
    await refreshChapters()
  }

  return {
    chapters,
    chaptersByAct,
    totalWordCount,
    totalChapters,
    status,
    refreshChapters,
    addChapter,
    removeChapter,
    moveChapter,
  }
}

export function useScenes(chapterId: MaybeRef<string>) {
  return useFetch<Scene[]>('/api/scenes', {
    query: { chapterId: toValue(chapterId) },
  })
}

export async function createScene(data: CreateSceneInput) {
  return $fetch<Scene>('/api/scenes', {
    method: 'POST',
    body: data,
  })
}

export async function updateScene(id: string, data: UpdateSceneInput) {
  return $fetch<Scene>(`/api/scenes/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export async function deleteScene(id: string) {
  return $fetch(`/api/scenes/${id}`, {
    method: 'DELETE',
  })
}
