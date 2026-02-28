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

const searchQuery = ref('')
const results = ref<any[]>([])
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
    const data = await $fetch('/api/chapters/search', {
      params: { bookId: projectId.value, q },
    })
    results.value = data as any[]
  } catch {
    results.value = []
  } finally {
    loading.value = false
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function highlightMatch(text: string) {
  if (!searchQuery.value.trim()) return escapeHtml(text)
  const sanitized = escapeHtml(text)
  const escaped = searchQuery.value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return sanitized.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>')
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
                <span class="text-sm font-medium text-(--ui-text-highlighted)" v-html="highlightMatch(result.title)" />
              </div>
              <p
                v-if="result.snippet"
                class="mt-1 text-xs text-(--ui-text-muted) line-clamp-2 [&_mark]:bg-yellow-300/40 [&_mark]:text-(--ui-text-highlighted) [&_mark]:rounded-sm"
                v-html="highlightMatch(result.snippet)"
              />
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
