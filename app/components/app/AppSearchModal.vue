<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })
const router = useRouter()
const route = useRoute()

const projectId = computed(() => {
  const id = route.params.id as string | undefined
  if (id) return id
  const match = route.path.match(/^\/project\/([^/]+)/)
  return match?.[1] ?? null
})

interface ChapterSearchResult {
  id: string
  number: number
  title: string
  snippet?: string
}

interface HighlightSegment {
  text: string
  match: boolean
}

const searchQuery = ref('')
const results = ref<ChapterSearchResult[]>([])
const loading = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(searchQuery, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (!val.trim()) {
    results.value = []
    loading.value = false
    return
  }
  loading.value = true
  debounceTimer = setTimeout(() => search(val.trim()), 300)
})

watch(open, (val) => {
  if (!val) {
    searchQuery.value = ''
    results.value = []
    loading.value = false
  }
})

async function search(q: string) {
  if (!projectId.value) return
  try {
    const data = await $fetch<ChapterSearchResult[]>('/api/chapters/search', {
      params: { bookId: projectId.value, q },
    })
    results.value = data
  } catch {
    results.value = []
  } finally {
    loading.value = false
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function splitMatches(text: string): HighlightSegment[] {
  const query = searchQuery.value.trim()
  if (!query) return [{ text: escapeHtml(text), match: false }]

  const sanitized = escapeHtml(text)
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const segments: HighlightSegment[] = []

  let lastIndex = 0
  let match = regex.exec(sanitized)
  while (match !== null) {
    const start = match.index
    const end = start + match[0].length
    if (start > lastIndex) {
      segments.push({ text: sanitized.slice(lastIndex, start), match: false })
    }
    segments.push({ text: sanitized.slice(start, end), match: true })
    lastIndex = end
    match = regex.exec(sanitized)
  }
  if (lastIndex < sanitized.length) {
    segments.push({ text: sanitized.slice(lastIndex), match: false })
  }
  return segments
}

function goToChapter(chapterId: string) {
  open.value = false
  router.push(`/project/${projectId.value}/write/${chapterId}`)
}
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-xl' }">
    <template #content>
      <div class="flex flex-col max-h-[28rem]">
        <div class="p-3 border-b border-(--ui-border)">
          <UInput
            v-model="searchQuery"
            placeholder="Search across chapters..."
            icon="i-lucide-search"
            autofocus
            size="lg"
            variant="none"
          />
        </div>

        <div class="flex-1 overflow-y-auto p-2">
          <div v-if="loading" class="flex items-center justify-center py-8 text-(--ui-text-muted)">
            <UIcon name="i-lucide-loader-2" class="size-5 animate-spin mr-2" />
            Searching...
          </div>

          <template v-else-if="results.length">
            <button
              v-for="result in results"
              :key="result.id"
              class="w-full text-left rounded-md px-3 py-2.5 transition-colors hover:bg-(--ui-bg-elevated) cursor-pointer"
              @click="goToChapter(result.id)"
            >
              <div class="flex items-center gap-2">
                <span class="text-xs font-mono text-(--ui-text-dimmed)">Ch. {{ result.number }}</span>
                <span class="text-sm font-medium text-(--ui-text-highlighted)">
                  <template v-for="(segment, idx) in splitMatches(result.title)" :key="`title-${idx}`">
                    <mark v-if="segment.match">{{ segment.text }}</mark>
                    <span v-else>{{ segment.text }}</span>
                  </template>
                </span>
              </div>
              <p
                v-if="result.snippet"
                class="mt-1 text-xs text-(--ui-text-muted) line-clamp-2 [&_mark]:bg-yellow-300/40 [&_mark]:text-(--ui-text-highlighted) [&_mark]:rounded-sm"
              >
                <template v-for="(segment, idx) in splitMatches(result.snippet)" :key="`snippet-${idx}`">
                  <mark v-if="segment.match">{{ segment.text }}</mark>
                  <span v-else>{{ segment.text }}</span>
                </template>
              </p>
            </button>
          </template>

          <div v-else-if="searchQuery.trim()" class="flex flex-col items-center justify-center py-8 text-(--ui-text-muted)">
            <UIcon name="i-lucide-search-x" class="size-8 mb-2" />
            <span class="text-sm">No results found</span>
          </div>

          <div v-else class="flex flex-col items-center justify-center py-8 text-(--ui-text-dimmed)">
            <UIcon name="i-lucide-file-search" class="size-8 mb-2" />
            <span class="text-sm">Search chapter titles and content</span>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
