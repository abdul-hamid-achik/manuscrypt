<script setup lang="ts">
import type { ContentSnapshot, TipTapNode } from "~~/shared/types"

const props = defineProps<{
  chapterId: string
}>()

const emit = defineEmits<{
  close: []
  restore: [content: string]
}>()

const { data: snapshots, refresh } = await useFetch<ContentSnapshot[]>("/api/snapshots", {
  params: { chapterId: props.chapterId },
})

const selectedSnapshot = ref<ContentSnapshot | null>(null)
const previewContent = ref("")

async function selectSnapshot(snapshot: ContentSnapshot) {
  selectedSnapshot.value = snapshot
  try {
    const json = JSON.parse(snapshot.content)
    // Convert TipTap JSON to plain text for preview
    previewContent.value = extractText(json)
  } catch {
    previewContent.value = snapshot.content
  }
}

function extractText(node: TipTapNode | null): string {
  if (!node) return ""
  if (node.text) return node.text
  if (node.content) {
    return node.content.map((child) => extractText(child)).join(node.type === "paragraph" ? "\n\n" : "")
  }
  return ""
}

function restoreSnapshot() {
  if (!selectedSnapshot.value) return
  emit("restore", selectedSnapshot.value.content)
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined })
}

onMounted(() => {
  refresh()
})
</script>

<template>
  <div class="w-80 border-l border-(--ui-border) bg-(--ui-bg) flex flex-col h-full overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-(--ui-border)">
      <h3 class="text-sm font-semibold text-(--ui-text-highlighted)">Version History</h3>
      <UButton
        icon="i-lucide-x"
        variant="ghost"
        size="xs"
        color="neutral"
        aria-label="Close version history"
        @click="emit('close')"
      />
    </div>

    <!-- Snapshot list -->
    <div v-if="snapshots?.length" class="flex-1 overflow-y-auto">
      <button
        v-for="snapshot in snapshots"
        :key="snapshot.id"
        class="w-full text-left px-4 py-3 border-b border-(--ui-border) hover:bg-(--ui-bg-elevated) transition-colors"
        :class="{ 'bg-(--ui-bg-elevated)': selectedSnapshot?.id === snapshot.id }"
        @click="selectSnapshot(snapshot)"
      >
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs text-(--ui-text-dimmed)">{{ formatDate(snapshot.createdAt) }}</span>
          <span class="text-xs text-(--ui-text-dimmed)">{{ snapshot.wordCount.toLocaleString() }} words</span>
        </div>
        <div v-if="snapshot.label" class="text-xs font-medium text-(--ui-text-highlighted)">
          {{ snapshot.label }}
        </div>
      </button>
    </div>
    <div v-else class="flex-1 flex items-center justify-center p-4">
      <p class="text-sm text-(--ui-text-dimmed) text-center">No snapshots yet. Versions are saved automatically as you write.</p>
    </div>

    <!-- Preview / Restore -->
    <div v-if="selectedSnapshot" class="border-t border-(--ui-border)">
      <div class="px-4 py-2 max-h-48 overflow-y-auto">
        <p class="text-xs text-(--ui-text-dimmed) font-serif whitespace-pre-wrap line-clamp-6">
          {{ previewContent.slice(0, 500) }}{{ previewContent.length > 500 ? '...' : '' }}
        </p>
      </div>
      <div class="px-4 py-2 border-t border-(--ui-border)">
        <UButton
          label="Restore this version"
          color="primary"
          size="xs"
          block
          @click="restoreSnapshot"
        />
      </div>
    </div>
  </div>
</template>
