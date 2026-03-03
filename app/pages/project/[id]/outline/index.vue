<script setup lang="ts">
const route = useRoute()
const projectId = computed(() => route.params.id as string)

const { data: book } = useBook(projectId)

const outlineBoardRef = ref<{ refreshChapters?: () => Promise<void> } | null>(null)

const isGenerating = ref(false)
const toast = useToast()

async function generateOutline() {
  isGenerating.value = true
  try {
    await $fetch('/api/ai/generate-outline', {
      method: 'POST',
      body: { bookId: projectId.value },
    })
    toast.add({ title: 'Outline generated successfully', color: 'success' })
    // Refresh the outline board
    await outlineBoardRef.value?.refreshChapters?.()
  } catch (e) {
    toast.add({
      title: 'Failed to generate outline',
      description: e instanceof Error ? e.message : 'Please try again.',
      color: 'error',
    })
  } finally {
    isGenerating.value = false
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
          @click="generateOutline"
        />
      </div>
    </div>

    <!-- Outline board -->
    <OutlineBoard ref="outlineBoardRef" :book-id="projectId" :project-id="projectId" />
  </div>
</template>
