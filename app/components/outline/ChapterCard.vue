<script setup lang="ts">
import type { Chapter, Scene } from '~~/shared/types'

const props = defineProps<{
  chapter: Chapter
  projectId: string
  isFirst?: boolean
  isLast?: boolean
}>()

const emit = defineEmits<{
  edit: [chapter: Chapter]
  delete: [id: string]
  moveUp: [id: string]
  moveDown: [id: string]
  refresh: []
  dragstart: [chapter: Chapter, event: DragEvent]
  dragend: [event: DragEvent]
}>()

const isDragging = ref(false)

function onDragStart(e: DragEvent) {
  isDragging.value = true
  e.dataTransfer!.effectAllowed = 'move'
  e.dataTransfer!.setData('text/plain', props.chapter.id)
  emit('dragstart', props.chapter, e)
}

function onDragEnd(e: DragEvent) {
  isDragging.value = false
  emit('dragend', e)
}

const expanded = ref(false)
const scenes = ref<Scene[]>([])
const loadingScenes = ref(false)
const confirmDelete = ref(false)
const editingScene = ref<Scene | undefined>()
const showSceneForm = ref(false)

const statusConfig: Record<string, { color: string; label: string }> = {
  planned: { color: 'neutral', label: 'Planned' },
  outlined: { color: 'info', label: 'Outlined' },
  drafting: { color: 'primary', label: 'Drafting' },
  revising: { color: 'warning', label: 'Revising' },
  done: { color: 'success', label: 'Done' },
}

const chapterStatus = computed(() => {
  const s = props.chapter.status ?? 'planned'
  return statusConfig[s] ?? statusConfig.planned!
})

const synopsisTruncated = computed(() => {
  if (!props.chapter.synopsis) return null
  return props.chapter.synopsis.length > 120
    ? props.chapter.synopsis.slice(0, 120) + '...'
    : props.chapter.synopsis
})

async function toggleExpand() {
  expanded.value = !expanded.value
  if (expanded.value && scenes.value.length === 0) {
    loadingScenes.value = true
    try {
      scenes.value = await $fetch<Scene[]>('/api/scenes', {
        query: { chapterId: props.chapter.id },
      })
    } catch {
      // scenes may not be available yet
    } finally {
      loadingScenes.value = false
    }
  }
}

async function addScene() {
  const nextOrder = scenes.value.length + 1
  try {
    const scene = await $fetch<Scene>('/api/scenes', {
      method: 'POST',
      body: {
        chapterId: props.chapter.id,
        title: `Scene ${nextOrder}`,
        sortOrder: nextOrder,
      },
    })
    scenes.value.push(scene)
  } catch {
    // handle error
  }
}

async function handleDeleteScene(id: string) {
  const confirmed = window.confirm('Delete this scene? This cannot be undone.')
  if (!confirmed) return
  try {
    await $fetch(`/api/scenes/${id}`, { method: 'DELETE' })
    scenes.value = scenes.value.filter(s => s.id !== id)
  } catch {
    // handle error
  }
}

function handleDelete() {
  if (!confirmDelete.value) {
    confirmDelete.value = true
    return
  }
  emit('delete', props.chapter.id)
  confirmDelete.value = false
}

function cancelDelete() {
  confirmDelete.value = false
}

function handleEditScene(scene: Scene) {
  editingScene.value = scene
  showSceneForm.value = true
}

async function onSceneSaved() {
  showSceneForm.value = false
  editingScene.value = undefined
  // Refresh the scenes list
  try {
    scenes.value = await $fetch<Scene[]>('/api/scenes', {
      query: { chapterId: props.chapter.id },
    })
  } catch {
    // scenes may not be available yet
  }
}

function onSceneCancelled() {
  showSceneForm.value = false
  editingScene.value = undefined
}
</script>

<template>
  <UCard
    draggable="true"
    class="transition-shadow hover:shadow-md"
    :class="{
      'opacity-40 border-dashed border-2 border-(--ui-primary)': isDragging,
    }"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
  >
    <!-- Header -->
    <div class="flex items-start gap-3">
      <!-- Drag handle + Move buttons -->
      <div class="flex shrink-0 items-center gap-1 pt-0.5">
        <span class="i-lucide-grip-vertical size-4 cursor-grab text-(--ui-text-dimmed) active:cursor-grabbing" />
        <div class="flex flex-col gap-0.5">
          <UButton
            icon="i-lucide-chevron-up"
            size="xs"
            variant="ghost"
            color="neutral"
            :disabled="isFirst"
            @click="emit('moveUp', chapter.id)"
          />
          <UButton
            icon="i-lucide-chevron-down"
            size="xs"
            variant="ghost"
            color="neutral"
            :disabled="isLast"
            @click="emit('moveDown', chapter.id)"
          />
        </div>
      </div>

      <!-- Main content -->
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs font-semibold uppercase tracking-wider text-(--ui-text-dimmed)">
            Ch. {{ chapter.number }}
          </span>
          <h3 class="font-semibold text-(--ui-text-highlighted) truncate">
            {{ chapter.title }}
          </h3>
          <UBadge :color="chapterStatus.color as any" variant="soft" size="sm">
            {{ chapterStatus.label }}
          </UBadge>
        </div>

        <p v-if="synopsisTruncated" class="mt-1.5 text-sm text-(--ui-text-muted) leading-relaxed">
          {{ synopsisTruncated }}
        </p>

        <!-- Stats -->
        <div class="mt-2 flex items-center gap-4 text-xs text-(--ui-text-dimmed)">
          <span class="flex items-center gap-1">
            <span class="i-lucide-file-text size-3.5" />
            {{ (chapter.wordCount ?? 0).toLocaleString() }} words
          </span>
          <span v-if="expanded" class="flex items-center gap-1">
            <span class="i-lucide-clapperboard size-3.5" />
            {{ scenes.length }} {{ scenes.length === 1 ? 'scene' : 'scenes' }}
          </span>
          <span v-if="chapter.act" class="flex items-center gap-1">
            <span class="i-lucide-bookmark size-3.5" />
            Act {{ chapter.act }}
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex shrink-0 items-center gap-1">
        <UButton
          icon="i-lucide-pen-line"
          size="xs"
          variant="soft"
          :to="`/project/${projectId}/write/${chapter.id}`"
          label="Write"
        />
        <UButton
          :icon="expanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          size="xs"
          variant="ghost"
          color="neutral"
          @click="toggleExpand"
        />
        <UButton
          icon="i-lucide-pencil"
          size="xs"
          variant="ghost"
          color="neutral"
          @click="emit('edit', chapter)"
        />
        <template v-if="confirmDelete">
          <UButton
            label="Confirm"
            size="xs"
            variant="soft"
            color="error"
            @click="handleDelete"
          />
          <UButton
            label="Cancel"
            size="xs"
            variant="ghost"
            color="neutral"
            @click="cancelDelete"
          />
        </template>
        <UButton
          v-else
          icon="i-lucide-trash-2"
          size="xs"
          variant="ghost"
          color="error"
          @click="handleDelete"
        />
      </div>
    </div>

    <!-- Expanded scene list -->
    <div v-if="expanded" class="mt-4 border-t border-(--ui-border) pt-4 space-y-2">
      <div v-if="loadingScenes" class="flex items-center justify-center py-4">
        <span class="i-lucide-loader-2 size-5 animate-spin text-(--ui-text-dimmed)" />
      </div>
      <template v-else>
        <SceneCard
          v-for="scene in scenes"
          :key="scene.id"
          :scene="scene"
          @edit="handleEditScene"
          @delete="handleDeleteScene"
        />
        <p v-if="scenes.length === 0" class="py-2 text-center text-sm text-(--ui-text-dimmed)">
          No scenes yet
        </p>
        <UButton
          icon="i-lucide-plus"
          label="Add Scene"
          size="xs"
          variant="ghost"
          color="neutral"
          block
          class="mt-2"
          @click="addScene"
        />
      </template>
    </div>

    <!-- Scene edit slideover -->
    <USlideover
      v-model:open="showSceneForm"
      :title="editingScene ? 'Edit Scene' : 'New Scene'"
      :description="editingScene ? 'Update this scene\'s details' : 'Add a new scene to this chapter'"
    >
      <template #body>
        <SceneForm
          :scene="editingScene"
          :chapter-id="chapter.id"
          :book-id="projectId"
          @saved="onSceneSaved"
          @cancelled="onSceneCancelled"
        />
      </template>
    </USlideover>
  </UCard>
</template>
