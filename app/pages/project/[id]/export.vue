<script setup lang="ts">
import type { BookStats } from '~~/shared/types'

definePageMeta({ layout: 'default' })

const route = useRoute()
const id = route.params.id as string

const { data: book, error: bookError } = useBook(id)
const { data: stats, error: statsError } = useFetch<BookStats>(() => `/api/books/${id}/stats`)
const { isExporting, exportMarkdown, exportPlainText, exportDocx } = useExport(id)

const fetchError = computed(() => bookError.value || statsError.value)
</script>

<template>
  <div class="mx-auto max-w-4xl px-6 py-8 lg:px-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-(--ui-text-highlighted) tracking-tight">
        Export Your Manuscript
      </h1>
      <p class="mt-1 text-sm text-(--ui-text-muted)">
        Download your assembled manuscript in your preferred format.
      </p>
    </div>

    <!-- Error -->
    <div v-if="fetchError" class="flex flex-col items-center justify-center py-16 gap-4">
      <UIcon name="i-lucide-alert-triangle" class="text-4xl text-red-500" />
      <p class="text-lg text-(--ui-text-dimmed)">Failed to load export data</p>
      <UButton label="Go Back" variant="outline" @click="$router.back()" />
    </div>

    <template v-else>
    <!-- Stats Summary -->
    <div v-if="stats" class="mb-8 flex flex-wrap gap-6 text-sm text-(--ui-text-muted)">
      <div class="flex items-center gap-2">
        <span class="i-lucide-layers size-4" />
        <span>{{ stats.totalChapters }} chapters</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="i-lucide-type size-4" />
        <span>{{ stats.totalWords.toLocaleString() }} words</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="i-lucide-bar-chart-3 size-4" />
        <span>{{ stats.completionPercentage }}% complete</span>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="stats && stats.totalChapters === 0" class="mt-16 flex flex-col items-center text-center">
      <div class="mb-4 text-5xl opacity-30">
        <span class="i-lucide-download" />
      </div>
      <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">Nothing to export yet</h2>
      <p class="mt-2 max-w-md text-sm text-(--ui-text-muted)">
        Write some chapters first — your manuscript will be ready to export once you have content.
      </p>
      <UButton
        label="Go to Outline"
        class="mt-4"
        variant="soft"
        icon="i-lucide-list-tree"
        :to="`/project/${id}/outline`"
      />
    </div>

    <!-- Export Options -->
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <ExportOptions
        format="Word Document"
        description="Export as Word (.docx) — industry-standard format for submitting to agents and publishers."
        icon="i-lucide-file-type"
        @export="exportDocx(book?.title)"
      />
      <ExportOptions
        format="Markdown"
        description="Export as Markdown (.md) — ideal for further editing, version control, or publishing platforms."
        icon="i-lucide-file-text"
        @export="exportMarkdown"
      />
      <ExportOptions
        format="Plain Text"
        description="Export as Plain Text (.txt) — universal format readable on any device."
        icon="i-lucide-file"
        @export="exportPlainText"
      />
    </div>

    <!-- Exporting indicator -->
    <div v-if="isExporting" class="mt-6 flex items-center gap-2 text-sm text-(--ui-text-muted)">
      <span class="i-lucide-loader-2 size-4 animate-spin" />
      Preparing your download...
    </div>

    <!-- Book info -->
    <div v-if="book" class="mt-10 rounded-lg border border-(--ui-border) p-4">
      <h3 class="text-sm font-semibold text-(--ui-text-highlighted)">
        {{ book.title }}
      </h3>
      <p v-if="book.premise" class="mt-1 text-xs text-(--ui-text-dimmed) line-clamp-2">
        {{ book.premise }}
      </p>
    </div>
    </template>
  </div>
</template>
