<script setup lang="ts">
definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const { data: book, status: bookStatus } = useBook(id)

const genres = [
  'Literary Fiction',
  'Fantasy',
  'Sci-Fi',
  'Mystery',
  'Romance',
  'Historical',
  'Other',
]

const statuses = ['planning', 'writing', 'editing', 'complete']

const form = reactive({
  title: '',
  genre: '',
  premise: '',
  targetWordCount: 80000,
  styleGuide: '',
  status: 'planning',
})

const saving = ref(false)
const showDeleteModal = ref(false)
const deleting = ref(false)

watch(
  () => book.value,
  (b) => {
    if (!b) return
    const data = b as any
    form.title = data.title ?? ''
    form.genre = data.genre ?? ''
    form.premise = data.premise ?? ''
    form.targetWordCount = data.targetWordCount ?? 80000
    form.styleGuide = data.styleGuide ?? ''
    form.status = data.status ?? 'planning'
  },
  { immediate: true },
)

async function save() {
  if (!form.title.trim()) return
  saving.value = true
  try {
    await updateBook(id, {
      title: form.title.trim(),
      genre: form.genre || undefined,
      premise: form.premise.trim() || undefined,
      targetWordCount: form.targetWordCount,
      styleGuide: form.styleGuide.trim() || undefined,
      status: form.status,
    })
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  deleting.value = true
  try {
    await deleteBook(id)
    await router.push('/projects')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-6 py-8 lg:px-8">
    <!-- Header -->
    <div class="mb-8">
      <NuxtLink :to="`/project/${id}`" class="mb-2 inline-flex items-center gap-1 text-sm text-(--ui-text-muted) hover:text-(--ui-text-highlighted)">
        <span class="i-lucide-arrow-left size-4" />
        Back to project
      </NuxtLink>
      <h1 class="text-2xl font-bold text-(--ui-text-highlighted) tracking-tight">
        Project Settings
      </h1>
    </div>

    <!-- Loading -->
    <div v-if="bookStatus === 'pending'" class="space-y-4">
      <USkeleton v-for="i in 5" :key="i" class="h-12 rounded-lg" />
    </div>

    <!-- Form -->
    <form v-else class="space-y-6" @submit.prevent="save">
      <UFormField label="Title" required>
        <UInput
          v-model="form.title"
          placeholder="Your manuscript title"
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
        <UTextarea
          v-model="form.styleGuide"
          placeholder="Describe the writing style you're aiming for..."
          :rows="3"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Status">
        <USelect
          v-model="form.status"
          :items="statuses.map(s => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s }))"
          value-key="value"
          class="w-full"
        />
      </UFormField>

      <UButton
        type="submit"
        label="Save Changes"
        icon="i-lucide-save"
        :loading="saving"
        :disabled="!form.title.trim()"
      />
    </form>

    <!-- Danger Zone -->
    <div class="mt-12 rounded-lg border border-red-200 p-6 dark:border-red-800">
      <h2 class="text-lg font-semibold text-red-600 dark:text-red-400">Danger Zone</h2>
      <p class="mt-2 text-sm text-(--ui-text-muted)">
        Permanently delete this project and all of its chapters, characters, and locations. This action cannot be undone.
      </p>
      <UButton
        label="Delete Project"
        color="error"
        variant="soft"
        icon="i-lucide-trash-2"
        class="mt-4"
        @click="showDeleteModal = true"
      />
    </div>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #header>
        <h3 class="text-lg font-semibold text-(--ui-text-highlighted)">Delete Project</h3>
      </template>
      <template #body>
        <p class="text-sm text-(--ui-text-muted)">
          Are you sure you want to delete <strong>{{ form.title }}</strong>? All chapters, characters, and other data will be permanently lost.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton label="Cancel" variant="ghost" @click="showDeleteModal = false" />
          <UButton
            label="Delete Forever"
            color="error"
            :loading="deleting"
            @click="confirmDelete"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
