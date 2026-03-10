<script setup lang="ts">
interface PreviewScene {
  title: string
  synopsis: string | null
  moodStart: string | null
  moodEnd: string | null
  povCharacterId: string | null
  locationId: string | null
}

interface PreviewChapter {
  number: number
  title: string
  synopsis: string | null
  act: number
  scenes: PreviewScene[]
}

interface OutlinePreviewResponse {
  action: string
  mode: string
  chapters: PreviewChapter[]
  warnings: string[]
}

const route = useRoute()
const projectId = computed(() => route.params.id as string)

const { data: book } = useBook(projectId)

const outlineBoardRef = ref<{ refreshChapters?: () => Promise<void> } | null>(null)

const isGenerating = ref(false)
const isApplying = ref(false)
const toast = useToast()

const showPreviewModal = ref(false)
const preview = ref<OutlinePreviewResponse | null>(null)
const previewError = ref<string | null>(null)

async function generateOutlinePreview() {
  previewError.value = null
  preview.value = null
  isGenerating.value = true

  try {
    const response = await $fetch<OutlinePreviewResponse>('/api/ai/generate-outline', {
      method: 'POST',
      body: { bookId: projectId.value, mode: 'preview' },
    })

    preview.value = response
    showPreviewModal.value = true
  } catch (e) {
    previewError.value = e instanceof Error ? e.message : 'Please try again.'
    toast.add({
      title: 'Failed to generate outline',
      description: previewError.value,
      color: 'error',
    })
  } finally {
    isGenerating.value = false
  }
}

async function applyOutline(mode: 'append' | 'replace') {
  if (!preview.value) return

  isApplying.value = true
  try {
    await $fetch('/api/ai/generate-outline', {
      method: 'POST',
      body: {
        bookId: projectId.value,
        mode,
        outline: { chapters: preview.value.chapters },
      },
    })

    toast.add({
      title: 'Outline applied',
      description: mode === 'replace'
        ? 'Your existing outline was replaced and the AI structure was applied.'
        : 'The generated outline was appended to your existing structure.',
      color: 'success',
    })

    showPreviewModal.value = false
    preview.value = null
    await outlineBoardRef.value?.refreshChapters?.()
  } catch (e) {
    toast.add({
      title: 'Failed to apply outline',
      description: e instanceof Error ? e.message : 'Please try again.',
      color: 'error',
    })
  } finally {
    isApplying.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-6 py-8">
    <!-- Page header -->
    <div class="mb-8">
      <div class="flex items-center gap-2 text-sm text-(--ui-text-muted) mb-1">
        <NuxtLink :to="`/project/${projectId}`" class="hover:text-(--ui-text-highlighted) transition-colors">
          {{ book?.title ?? 'Project' }}
        </NuxtLink>
        <span class="i-lucide-chevron-right size-3.5" />
        <span>Outline</span>
      </div>

      <div class="flex items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-(--ui-text-highlighted) tracking-tight">
            Story Outline
          </h1>
          <p class="mt-1 text-sm text-(--ui-text-muted)">
            Plan your chapters and scenes across the three-act structure.
          </p>
        </div>
        <UButton
          icon="i-lucide-sparkles"
          label="Generate Outline with AI"
          color="primary"
          variant="soft"
          :loading="isGenerating"
          :disabled="isGenerating"
          @click="generateOutlinePreview"
        />
      </div>
    </div>

    <!-- Outline board -->
    <OutlineBoard ref="outlineBoardRef" :book-id="projectId" :project-id="projectId" />

    <!-- AI outline preview modal -->
    <UModal v-model:open="showPreviewModal" title="AI Outline Preview" description="Review the generated outline before applying it to your manuscript.">
      <template #body>
        <div v-if="isGenerating" class="space-y-3 py-2">
          <USkeleton class="h-4 w-40" />
          <USkeleton class="h-4 w-full" />
          <USkeleton class="h-4 w-full" />
        </div>

        <div v-else-if="previewError" class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {{ previewError }}
        </div>

        <div v-else-if="preview">
          <p class="mb-3 text-sm text-(--ui-text-muted)">
            The assistant generated {{ preview.chapters.length }} chapters.
          </p>

          <div class="max-h-80 space-y-3 overflow-y-auto pr-2">
            <UCard v-for="chapter in preview.chapters" :key="chapter.number + '-' + chapter.title" class="border border-(--ui-border)">
              <template #header>
                <div class="text-sm font-semibold text-(--ui-text-highlighted)">
                  Chapter {{ chapter.number }}
                </div>
              </template>

              <div>
                <div class="text-sm font-medium text-(--ui-text-highlighted)">{{ chapter.title }}</div>
                <p class="mt-1 text-xs text-(--ui-text-muted)">{{ chapter.synopsis ?? 'No synopsis provided.' }}</p>
                <div class="mt-2 text-xs text-(--ui-text-dimmed)">
                  Act {{ chapter.act }} · {{ chapter.scenes.length }} scene{{ chapter.scenes.length === 1 ? '' : 's' }}
                </div>
              </div>
            </UCard>
          </div>

          <div v-if="preview.warnings.length" class="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <ul class="list-disc space-y-1 pl-4">
              <li v-for="warning in preview.warnings" :key="warning">{{ warning }}</li>
            </ul>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex flex-wrap justify-end gap-2">
          <UButton label="Close" variant="ghost" @click="showPreviewModal = false" />
          <UButton
            label="Append to Existing"
            icon="i-lucide-plus"
            :loading="isApplying"
            @click="applyOutline('append')"
          />
          <UButton
            label="Replace Existing"
            icon="i-lucide-refresh-cw"
            color="warning"
            :loading="isApplying"
            @click="applyOutline('replace')"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
