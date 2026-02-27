<script setup lang="ts">
import { styleGuides } from '~/data/suggestions'

const open = defineModel<boolean>({ default: false })

const genres = [
  'Literary Fiction',
  'Fantasy',
  'Sci-Fi',
  'Mystery',
  'Romance',
  'Historical',
  'Other',
]

const createItem = { position: 'bottom' as const, when: 'always' as const }

const form = reactive({
  title: '',
  genre: '',
  premise: '',
  targetWordCount: 80000,
  styleGuide: '',
})

const toast = useToast()
const loading = ref(false)
const router = useRouter()

async function submit() {
  if (!form.title.trim()) return
  loading.value = true
  try {
    const book = await createBook({
      title: form.title.trim(),
      genre: form.genre || undefined,
      premise: form.premise.trim() || undefined,
      targetWordCount: form.targetWordCount,
      styleGuide: form.styleGuide || undefined,
    })
    open.value = false
    await router.push(`/project/${(book as any).id}`)
  } catch (e) {
    toast.add({ title: 'Error', description: e instanceof Error ? e.message : 'Something went wrong', color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <USlideover v-model:open="open" title="New Project" description="Begin a new manuscript">
    <template #body>
      <form class="space-y-5" @submit.prevent="submit">
        <UFormField label="Title" required>
          <UInput
            v-model="form.title"
            placeholder="The working title of your manuscript"
            autofocus
            class="w-full"
          />
        </UFormField>

        <UFormField label="Genre">
          <USelect
            v-model="form.genre"
            :items="genres"
            placeholder="Select a genre"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Premise">
          <UTextarea
            v-model="form.premise"
            placeholder="A brief summary of your story's premise..."
            :rows="3"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Target Word Count">
          <UInput
            v-model.number="form.targetWordCount"
            type="number"
            :min="1000"
            :step="1000"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Style Guide">
          <UInputMenu
            v-model="form.styleGuide"
            :items="styleGuides"
            :create-item="createItem"
            placeholder="Search or type custom..."
            class="w-full"
          />
        </UFormField>

        <UButton
          type="submit"
          label="Create Project"
          block
          :loading="loading"
          :disabled="!form.title.trim()"
        />
      </form>
    </template>
  </USlideover>
</template>
