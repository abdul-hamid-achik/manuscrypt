<script setup lang="ts">
import { CHAPTER_STATUSES } from '~~/shared/types'
import type { Chapter, UpdateChapterInput } from '~~/shared/types'

const props = defineProps<{
  bookId: string
  projectId: string
}>()

const {
  chaptersByAct,
  totalWordCount,
  totalChapters,
  status,
  refreshChapters,
  addChapter,
  removeChapter,
  moveChapter,
} = useOutline(props.bookId)

const editingChapter = ref<Chapter | null>(null)
const showEditModal = ref(false)
const editForm = reactive({
  title: '',
  synopsis: '',
  status: 'planned',
  act: 1,
})

const statusLabelsMap: Record<string, string> = {
  planned: 'Planned',
  outlined: 'Outlined',
  drafting: 'Drafting',
  revising: 'Revising',
  done: 'Done',
}
const statusOptions = CHAPTER_STATUSES.map((s) => ({ label: statusLabelsMap[s], value: s }))

const actOptions = [
  { label: 'Act 1 — Setup', value: 1 },
  { label: 'Act 2 — Confrontation', value: 2 },
  { label: 'Act 3 — Resolution', value: 3 },
]

function openEditModal(chapter: Chapter) {
  editingChapter.value = chapter
  editForm.title = chapter.title
  editForm.synopsis = chapter.synopsis ?? ''
  editForm.status = chapter.status ?? 'planned'
  editForm.act = chapter.act ?? 1
  showEditModal.value = true
}

async function saveEdit() {
  if (!editingChapter.value) return
  const data: UpdateChapterInput = {
    title: editForm.title,
    synopsis: editForm.synopsis || undefined,
    status: editForm.status,
    act: editForm.act,
  }
  await updateChapter(editingChapter.value.id, data)
  showEditModal.value = false
  editingChapter.value = null
  await refreshChapters()
}

function closeEditModal() {
  showEditModal.value = false
  editingChapter.value = null
}

async function handleDelete(id: string) {
  await removeChapter(id)
}

async function handleMoveUp(id: string) {
  await moveChapter(id, 'up')
}

async function handleMoveDown(id: string) {
  await moveChapter(id, 'down')
}

function isFirstInAct(chapter: Chapter, actChapters: Chapter[]) {
  return actChapters[0]?.id === chapter.id
}

function isLastInAct(chapter: Chapter, actChapters: Chapter[]) {
  return actChapters[actChapters.length - 1]?.id === chapter.id
}

const acts = [
  { num: 1, label: 'Act 1 — Setup', icon: 'i-lucide-sunrise' },
  { num: 2, label: 'Act 2 — Confrontation', icon: 'i-lucide-swords' },
  { num: 3, label: 'Act 3 — Resolution', icon: 'i-lucide-sunset' },
]

// --- Drag and drop ---
const draggedChapter = ref<Chapter | null>(null)
const dropIndicator = ref<{ actNum: number; index: number } | null>(null)
const dragOverAct = ref<number | null>(null)

function onChapterDragStart(chapter: Chapter) {
  draggedChapter.value = chapter
}

function onChapterDragEnd() {
  draggedChapter.value = null
  dropIndicator.value = null
  dragOverAct.value = null
}

function onActDragOver(e: DragEvent, actNum: number) {
  if (!draggedChapter.value) return
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'move'
  dragOverAct.value = actNum

  // Calculate drop index based on mouse position relative to cards
  const container = (e.currentTarget as HTMLElement).querySelector('[data-chapter-list]')
  if (!container) {
    dropIndicator.value = { actNum, index: 0 }
    return
  }

  const cards = Array.from(container.querySelectorAll('[data-chapter-id]'))
  const mouseY = e.clientY
  let insertIndex = cards.length // default: after last card

  for (let i = 0; i < cards.length; i++) {
    const rect = cards[i]!.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    if (mouseY < midY) {
      insertIndex = i
      break
    }
  }

  dropIndicator.value = { actNum, index: insertIndex }
}

function onActDragLeave(e: DragEvent) {
  // Only clear if we actually left the section (not entering a child)
  const related = e.relatedTarget as HTMLElement | null
  const current = e.currentTarget as HTMLElement
  if (!related || !current.contains(related)) {
    dragOverAct.value = null
    dropIndicator.value = null
  }
}

async function onActDrop(e: DragEvent, actNum: number) {
  e.preventDefault()
  const chapterId = e.dataTransfer!.getData('text/plain')
  if (!chapterId || !draggedChapter.value) return

  const chapter = draggedChapter.value
  const targetActChapters = chaptersByAct.value[actNum] ?? []
  const insertIndex = dropIndicator.value?.actNum === actNum ? dropIndicator.value.index : targetActChapters.length

  // Calculate new sortOrder based on neighbors
  let newSortOrder: number
  // Filter out the dragged chapter if it's already in this act
  const filtered = targetActChapters.filter(c => c.id !== chapter.id)

  if (filtered.length === 0) {
    newSortOrder = 1
  } else if (insertIndex === 0) {
    newSortOrder = filtered[0]!.sortOrder - 1
  } else if (insertIndex >= filtered.length) {
    newSortOrder = filtered[filtered.length - 1]!.sortOrder + 1
  } else {
    const before = filtered[insertIndex - 1]!.sortOrder
    const after = filtered[insertIndex]!.sortOrder
    newSortOrder = Math.round((before + after) / 2)
    // If we'd collide, shift to halfway with decimals
    if (newSortOrder === before || newSortOrder === after) {
      newSortOrder = (before + after) / 2
    }
  }

  // Clean up drag state
  draggedChapter.value = null
  dropIndicator.value = null
  dragOverAct.value = null

  // Update act if changed, then reorder
  if (chapter.act !== actNum) {
    await updateChapter(chapter.id, { act: actNum })
  }
  await reorderChapter(chapter.id, newSortOrder)
  await refreshChapters()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Stats summary -->
    <div class="flex items-center gap-6 text-sm text-(--ui-text-muted)">
      <span class="flex items-center gap-1.5">
        <span class="i-lucide-book-open size-4" />
        {{ totalChapters }} {{ totalChapters === 1 ? 'chapter' : 'chapters' }}
      </span>
      <span class="flex items-center gap-1.5">
        <span class="i-lucide-file-text size-4" />
        {{ totalWordCount.toLocaleString() }} words
      </span>
    </div>

    <!-- Loading state -->
    <div v-if="status === 'pending'" class="flex items-center justify-center py-16">
      <span class="i-lucide-loader-2 size-6 animate-spin text-(--ui-text-dimmed)" />
    </div>

    <!-- Act sections -->
    <template v-else>
      <section
        v-for="act in acts"
        :key="act.num"
        class="space-y-3 rounded-lg border-2 border-transparent p-3 -m-3 transition-colors"
        :class="{ 'border-(--ui-primary)/30 bg-(--ui-primary)/5': dragOverAct === act.num }"
        @dragover="onActDragOver($event, act.num)"
        @dragleave="onActDragLeave"
        @drop="onActDrop($event, act.num)"
      >
        <!-- Act header -->
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <span :class="[act.icon, 'size-4 text-(--ui-primary)']" />
            <h2 class="text-sm font-semibold uppercase tracking-wider text-(--ui-text-highlighted)">
              {{ act.label }}
            </h2>
          </div>
          <div class="h-px flex-1 bg-(--ui-border)" />
          <UBadge variant="subtle" size="xs" color="neutral">
            {{ (chaptersByAct[act.num] ?? []).length }}
          </UBadge>
        </div>

        <!-- Chapters in this act -->
        <div class="space-y-3 pl-6" data-chapter-list>
          <template v-for="(chapter, idx) in chaptersByAct[act.num] ?? []" :key="chapter.id">
            <!-- Drop indicator before this card -->
            <div
              v-if="dropIndicator?.actNum === act.num && dropIndicator?.index === idx"
              class="h-0.5 rounded-full bg-(--ui-primary) mx-2"
            />
            <ChapterCard
              :data-chapter-id="chapter.id"
              :chapter="chapter"
              :project-id="projectId"
              :is-first="isFirstInAct(chapter, chaptersByAct[act.num] ?? [])"
              :is-last="isLastInAct(chapter, chaptersByAct[act.num] ?? [])"
              @edit="openEditModal"
              @delete="handleDelete"
              @move-up="handleMoveUp"
              @move-down="handleMoveDown"
              @refresh="refreshChapters"
              @dragstart="onChapterDragStart"
              @dragend="onChapterDragEnd"
            />
          </template>
          <!-- Drop indicator after last card -->
          <div
            v-if="dropIndicator?.actNum === act.num && dropIndicator?.index === (chaptersByAct[act.num] ?? []).length"
            class="h-0.5 rounded-full bg-(--ui-primary) mx-2"
          />

          <UButton
            icon="i-lucide-plus"
            :label="`Add chapter to ${act.label}`"
            variant="outline"
            color="neutral"
            size="sm"
            block
            @click="addChapter(act.num)"
          />
        </div>
      </section>
    </template>

    <!-- Edit chapter modal -->
    <UModal v-model:open="showEditModal" title="Edit Chapter" description="Update chapter details">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Title">
            <UInput v-model="editForm.title" placeholder="Chapter title" />
          </UFormField>

          <UFormField label="Synopsis">
            <UTextarea v-model="editForm.synopsis" placeholder="Brief chapter summary..." :rows="3" />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Status">
              <USelect v-model="editForm.status" :items="statusOptions" />
            </UFormField>

            <UFormField label="Act">
              <USelect v-model="editForm.act" :items="actOptions" />
            </UFormField>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" variant="ghost" color="neutral" @click="closeEditModal" />
          <UButton label="Save" @click="saveEdit" />
        </div>
      </template>
    </UModal>
  </div>
</template>
