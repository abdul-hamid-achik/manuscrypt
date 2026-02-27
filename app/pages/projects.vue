<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { data: books, status } = useBooks()
const showNewProject = useState('showNewProjectModal', () => false)
</script>

<template>
  <div class="mx-auto max-w-6xl px-6 py-8 lg:px-8">
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-(--ui-text-highlighted) tracking-tight">
          Your Library
        </h1>
        <p class="mt-1 text-sm text-(--ui-text-muted)">
          All your manuscripts in one place.
        </p>
      </div>
      <UButton
        label="New Project"
        icon="i-lucide-plus"
        @click="showNewProject = true"
      />
    </div>

    <!-- Loading -->
    <div v-if="status === 'pending'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <USkeleton v-for="i in 6" :key="i" class="h-40 rounded-lg" />
    </div>

    <!-- Grid -->
    <div v-else-if="books?.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <ProjectCard
        v-for="book in books"
        :key="book.id"
        :book="book"
      />
    </div>

    <!-- Empty -->
    <div v-else class="mt-16 flex flex-col items-center text-center">
      <div class="mb-4 text-5xl opacity-30">
        <span class="i-lucide-library" />
      </div>
      <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">
        Your library is empty
      </h2>
      <p class="mt-2 max-w-md text-sm text-(--ui-text-muted)">
        Start building your collection — every manuscript begins with a single idea.
      </p>
      <UButton
        label="Create Your First Project"
        class="mt-6"
        size="lg"
        icon="i-lucide-plus"
        @click="showNewProject = true"
      />
    </div>

    <NewProjectModal v-model="showNewProject" />
  </div>
</template>
