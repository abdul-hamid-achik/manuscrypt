<script setup lang="ts">
definePageMeta({ layout: 'default' })

const route = useRoute()
const projectId = route.params.id as string
const toast = useToast()

const sampleText = ref('')
const { isAnalyzing, analysis, error, analyze, reset } = useStyleAnalysis()
const { data: book, refresh: refreshBook } = useBook(projectId)

const canAnalyze = computed(() => sampleText.value.trim().length >= 100)

async function handleAnalyze() {
  if (!canAnalyze.value) return
  await analyze(sampleText.value.trim())
}

function handleReset() {
  sampleText.value = ''
  reset()
}

async function saveToStyleGuide() {
  if (!analysis.value) return
  const summary = [
    `Tone: ${analysis.value.toneDescription}`,
    `Pace: ${analysis.value.paceDescription}`,
    `Avg sentence length: ${analysis.value.sentenceLengthAvg.toFixed(1)} words`,
    `Dialogue ratio: ${(analysis.value.dialogueRatio * 100).toFixed(0)}%`,
    `Strengths: ${analysis.value.strengths.join('; ')}`,
    `Comparable authors: ${analysis.value.comparableAuthors.join(', ')}`,
  ].join('\n')

  try {
    await $fetch(`/api/books/${projectId}` as string, {
      method: 'PUT',
      body: { styleGuide: summary },
    })
    await refreshBook()
    toast.add({ title: 'Style guide updated', description: 'Your AI assistant will now use this style when helping you write.', color: 'success' })
  } catch {
    toast.add({ title: 'Failed to save', description: 'Could not update the style guide.', color: 'error' })
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-6 py-8 lg:px-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-(--ui-text-highlighted) tracking-tight">
        Style Workshop
      </h1>
      <p class="mt-1 text-sm text-(--ui-text-muted)">
        Paste a sample of your writing to analyze its style, tone, and craft.
      </p>
    </div>

    <!-- Input Section -->
    <div class="mb-6 space-y-4">
      <UFormField label="Writing Sample">
        <UTextarea
          v-model="sampleText"
          placeholder="Paste at least 100 characters of your writing here..."
          :rows="10"
          class="w-full"
          :disabled="isAnalyzing"
        />
      </UFormField>
      <div class="flex items-center gap-3">
        <UButton
          label="Analyze Style"
          icon="i-lucide-sparkles"
          :loading="isAnalyzing"
          :disabled="!canAnalyze"
          @click="handleAnalyze"
        />
        <UButton
          v-if="analysis"
          label="Reset"
          variant="ghost"
          icon="i-lucide-rotate-ccw"
          @click="handleReset"
        />
        <span v-if="!canAnalyze && sampleText.length > 0" class="text-xs text-(--ui-text-dimmed)">
          {{ 100 - sampleText.trim().length }} more characters needed
        </span>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
      {{ error }}
    </div>

    <!-- Loading -->
    <div v-if="isAnalyzing" class="space-y-4">
      <USkeleton class="h-6 w-48 rounded" />
      <USkeleton class="h-24 rounded-lg" />
      <USkeleton class="h-24 rounded-lg" />
    </div>

    <!-- Results -->
    <div v-if="analysis && !isAnalyzing" class="space-y-6">
      <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">Analysis Results</h2>

      <!-- Metrics Grid -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UCard>
          <div class="text-center">
            <div class="text-2xl font-bold text-(--ui-text-highlighted)">
              {{ analysis.sentenceLengthAvg.toFixed(1) }}
            </div>
            <div class="mt-1 text-xs text-(--ui-text-dimmed)">Avg Words / Sentence</div>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <div class="text-2xl font-bold text-(--ui-text-highlighted)">
              {{ (analysis.vocabularyRichness * 100).toFixed(0) }}%
            </div>
            <div class="mt-1 text-xs text-(--ui-text-dimmed)">Vocabulary Richness</div>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <div class="text-2xl font-bold text-(--ui-text-highlighted)">
              {{ (analysis.dialogueRatio * 100).toFixed(0) }}%
            </div>
            <div class="mt-1 text-xs text-(--ui-text-dimmed)">Dialogue Ratio</div>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <div class="flex flex-wrap justify-center gap-1">
              <UBadge v-for="author in analysis.comparableAuthors" :key="author" variant="subtle" size="sm">
                {{ author }}
              </UBadge>
            </div>
            <div class="mt-1 text-xs text-(--ui-text-dimmed)">Comparable Authors</div>
          </div>
        </UCard>
      </div>

      <!-- Tone & Pace -->
      <div class="grid gap-4 sm:grid-cols-2">
        <UCard>
          <template #header>
            <h3 class="text-sm font-semibold text-(--ui-text-highlighted)">Tone</h3>
          </template>
          <p class="text-sm text-(--ui-text-muted) leading-relaxed">{{ analysis.toneDescription }}</p>
        </UCard>
        <UCard>
          <template #header>
            <h3 class="text-sm font-semibold text-(--ui-text-highlighted)">Pace</h3>
          </template>
          <p class="text-sm text-(--ui-text-muted) leading-relaxed">{{ analysis.paceDescription }}</p>
        </UCard>
      </div>

      <!-- Strengths & Suggestions -->
      <div class="grid gap-4 sm:grid-cols-2">
        <UCard>
          <template #header>
            <h3 class="text-sm font-semibold text-(--ui-text-highlighted)">Strengths</h3>
          </template>
          <ul class="space-y-2">
            <li v-for="strength in analysis.strengths" :key="strength" class="flex items-start gap-2 text-sm text-(--ui-text-muted)">
              <span class="i-lucide-check mt-0.5 size-4 shrink-0 text-green-500" />
              {{ strength }}
            </li>
          </ul>
        </UCard>
        <UCard>
          <template #header>
            <h3 class="text-sm font-semibold text-(--ui-text-highlighted)">Suggestions</h3>
          </template>
          <ul class="space-y-2">
            <li v-for="suggestion in analysis.suggestions" :key="suggestion" class="flex items-start gap-2 text-sm text-(--ui-text-muted)">
              <span class="i-lucide-lightbulb mt-0.5 size-4 shrink-0 text-(--ui-primary)" />
              {{ suggestion }}
            </li>
          </ul>
        </UCard>
      </div>

      <!-- Save to Style Guide -->
      <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated) p-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-semibold text-(--ui-text-highlighted)">Save to Style Guide</h3>
            <p class="mt-1 text-xs text-(--ui-text-dimmed)">
              Your AI writing assistant will use this analysis to match your style when helping you write.
            </p>
          </div>
          <UButton
            label="Save to Project"
            icon="i-lucide-save"
            variant="soft"
            @click="saveToStyleGuide"
          />
        </div>
        <p v-if="(book as any)?.styleGuide" class="mt-3 text-xs text-(--ui-text-dimmed) italic">
          Current style guide is set. Saving will replace it.
        </p>
      </div>
    </div>
  </div>
</template>
