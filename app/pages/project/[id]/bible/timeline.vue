<script setup lang="ts">
import type { Chapter, Scene, Character, Location } from '~~/shared/types'

definePageMeta({ layout: 'default' })

const route = useRoute()
const projectId = route.params.id as string

const { data: chapters, status: chaptersStatus } = useFetch<Chapter[]>(() => `/api/chapters?bookId=${projectId}`)
const { data: characters } = useFetch<Character[]>(() => `/api/characters?bookId=${projectId}`)
const { data: locations } = useFetch<Location[]>(() => `/api/locations?bookId=${projectId}`)

// Fetch scenes for each chapter
const allScenes = ref<Record<string, Scene[]>>({})
const scenesLoaded = ref(false)

watch(chapters, async (chs) => {
  if (!chs || !chs.length) {
    scenesLoaded.value = true
    return
  }
  const chapterList = chs
  const scenesMap: Record<string, Scene[]> = {}
  await Promise.all(
    chapterList.map(async (ch) => {
      try {
        const scenes = await $fetch<Scene[]>('/api/scenes', { params: { chapterId: ch.id } })
        scenesMap[ch.id] = scenes.sort((a, b) => a.sortOrder - b.sortOrder)
      } catch {
        scenesMap[ch.id] = []
      }
    }),
  )
  allScenes.value = scenesMap
  scenesLoaded.value = true
}, { immediate: true })

const sortedChapters = computed(() => {
  if (!chapters.value) return []
  return [...chapters.value].sort((a, b) => a.sortOrder - b.sortOrder)
})

const characterMap = computed(() => {
  const map = new Map<string, Character>()
  for (const c of (characters.value ?? [])) {
    map.set(c.id, c)
  }
  return map
})

const locationMap = computed(() => {
  const map = new Map<string, Location>()
  for (const l of (locations.value ?? [])) {
    map.set(l.id, l)
  }
  return map
})

const actLabels: Record<number, string> = {
  1: 'Act I — Setup',
  2: 'Act II — Confrontation',
  3: 'Act III — Resolution',
}

function actColor(act: number | null): string {
  const colors: Record<number, string> = { 1: 'info', 2: 'warning', 3: 'success' }
  return colors[act ?? 1] || 'neutral'
}

function statusIcon(status: string | null): string {
  const icons: Record<string, string> = {
    planned: 'i-lucide-circle-dashed',
    outlined: 'i-lucide-circle-dot',
    drafting: 'i-lucide-pen-line',
    revising: 'i-lucide-pencil',
    done: 'i-lucide-check-circle',
  }
  return icons[status ?? 'planned'] || 'i-lucide-circle'
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-6 py-8 lg:px-8">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center gap-2 mb-1">
        <NuxtLink
          :to="`/project/${projectId}/bible`"
          class="text-sm text-(--ui-text-dimmed) hover:text-(--ui-text-muted)"
        >
          Story Bible
        </NuxtLink>
        <span class="text-(--ui-text-dimmed)">/</span>
      </div>
      <h1 class="text-2xl font-serif font-bold text-(--ui-text-highlighted)">
        Timeline
      </h1>
      <p class="text-sm text-(--ui-text-muted) mt-1">
        Your story's structure at a glance — chapters, scenes, characters, and locations in order.
      </p>
    </div>

    <!-- Loading -->
    <div v-if="chaptersStatus === 'pending' || !scenesLoaded" class="space-y-6">
      <USkeleton v-for="i in 4" :key="i" class="h-24 rounded-lg" />
    </div>

    <!-- Empty -->
    <div v-else-if="!sortedChapters.length" class="mt-16 flex flex-col items-center text-center">
      <div class="mb-4 text-5xl opacity-30">
        <span class="i-lucide-git-branch" />
      </div>
      <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">No chapters yet</h2>
      <p class="mt-2 max-w-md text-sm text-(--ui-text-muted)">
        Create chapters in the Outline to see your story's timeline.
      </p>
      <UButton
        label="Go to Outline"
        class="mt-4"
        variant="soft"
        icon="i-lucide-list-tree"
        :to="`/project/${projectId}/outline`"
      />
    </div>

    <!-- Timeline -->
    <div v-else class="relative">
      <!-- Vertical line -->
      <div class="absolute left-4 top-0 bottom-0 w-0.5 bg-(--ui-border)" />

      <div class="space-y-1">
        <template v-for="chapter in sortedChapters" :key="chapter.id">
          <!-- Act divider -->
          <div
            v-if="chapter === sortedChapters[0] || chapter.act !== sortedChapters[sortedChapters.indexOf(chapter) - 1]?.act"
            class="relative flex items-center gap-3 py-3 pl-10"
          >
            <div class="absolute left-2.5 size-3 rounded-full border-2 border-(--ui-border) bg-(--ui-bg)" />
            <UBadge :color="actColor(chapter.act) as any" variant="soft" size="sm">
              {{ actLabels[chapter.act ?? 1] || `Act ${chapter.act}` }}
            </UBadge>
          </div>

          <!-- Chapter node -->
          <div class="relative pl-10">
            <!-- Node dot -->
            <div class="absolute left-1.5 top-4 size-5 rounded-full border-2 border-(--ui-primary) bg-(--ui-bg) flex items-center justify-center">
              <UIcon :name="statusIcon(chapter.status)" class="size-3 text-(--ui-primary)" />
            </div>

            <div class="rounded-lg border border-(--ui-border) p-4 transition-colors hover:bg-(--ui-bg-elevated)">
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-mono text-(--ui-text-dimmed)">Ch {{ chapter.number }}</span>
                  <h3 class="font-medium text-sm text-(--ui-text-highlighted)">
                    {{ chapter.title }}
                  </h3>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="text-xs text-(--ui-text-dimmed)">{{ (chapter.wordCount ?? 0).toLocaleString() }} words</span>
                  <UButton
                    icon="i-lucide-pen-line"
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    :to="`/project/${projectId}/write/${chapter.id}`"
                  />
                </div>
              </div>

              <p v-if="chapter.synopsis" class="mt-1 text-xs text-(--ui-text-muted) line-clamp-2">
                {{ chapter.synopsis }}
              </p>

              <!-- Scenes -->
              <div v-if="allScenes[chapter.id]?.length" class="mt-3 ml-2 space-y-2 border-l-2 border-dashed border-(--ui-border) pl-4">
                <div
                  v-for="scene in allScenes[chapter.id]"
                  :key="scene.id"
                  class="flex items-start gap-2"
                >
                  <div class="mt-1 size-1.5 rounded-full bg-(--ui-text-dimmed) shrink-0" />
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-xs font-medium text-(--ui-text-highlighted)">{{ scene.title }}</span>
                      <UBadge
                        v-if="scene.povCharacterId && characterMap.get(scene.povCharacterId)"
                        variant="subtle"
                        size="xs"
                        color="info"
                      >
                        <span class="i-lucide-user size-2.5 mr-0.5" />
                        {{ characterMap.get(scene.povCharacterId)!.name }}
                      </UBadge>
                      <UBadge
                        v-if="scene.locationId && locationMap.get(scene.locationId)"
                        variant="subtle"
                        size="xs"
                        color="neutral"
                      >
                        <span class="i-lucide-map-pin size-2.5 mr-0.5" />
                        {{ locationMap.get(scene.locationId)!.name }}
                      </UBadge>
                    </div>
                    <p v-if="scene.synopsis" class="text-xs text-(--ui-text-dimmed) line-clamp-1 mt-0.5">
                      {{ scene.synopsis }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
