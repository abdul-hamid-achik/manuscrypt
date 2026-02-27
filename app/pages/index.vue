<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { data: books, status } = useBooks()
const showNewProject = ref(false)

const hasProjects = computed(() => books.value && books.value.length > 0)

const workflowSteps = [
  {
    number: 1,
    title: 'Create a Project',
    description: 'Start with a title, genre, and premise. Set a word count target to keep yourself on track.',
    icon: 'i-lucide-folder-plus',
  },
  {
    number: 2,
    title: 'Build Your Outline',
    description: 'Structure your story in three acts. Add chapters and scenes with synopses to plan your narrative arc.',
    icon: 'i-lucide-list-tree',
  },
  {
    number: 3,
    title: 'Develop Your Cast',
    description: 'Create characters with motivations, fears, and contradictions. Interview them with AI to discover their voice.',
    icon: 'i-lucide-users',
  },
  {
    number: 4,
    title: 'Write Your Story',
    description: 'A distraction-free editor with AI assistance. Get help continuing scenes, deepening prose, or crafting dialogue.',
    icon: 'i-lucide-pen-line',
  },
  {
    number: 5,
    title: 'Review & Refine',
    description: 'Get AI-powered feedback on each chapter. Track revision status and polish your manuscript.',
    icon: 'i-lucide-sparkles',
  },
  {
    number: 6,
    title: 'Export & Share',
    description: 'Download your finished manuscript as Markdown, Plain Text, or Word Document.',
    icon: 'i-lucide-download',
  },
]
</script>

<template>
  <div class="mx-auto max-w-6xl px-6 py-8 lg:px-8">
    <!-- Welcome -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-(--ui-text-highlighted) tracking-tight">
        The Study
      </h1>
      <p class="mt-1 text-sm text-(--ui-text-muted)">
        Your writing workspace. Pick up where you left off.
      </p>
    </div>

    <!-- Quick actions -->
    <div class="mb-10 flex flex-wrap items-center gap-3">
      <UButton
        label="New Project"
        icon="i-lucide-plus"
        @click="showNewProject = true"
      />
      <UButton
        v-if="hasProjects"
        label="Continue Writing"
        variant="soft"
        icon="i-lucide-pen-line"
        :to="`/project/${books?.[0]?.id}/write`"
      />
    </div>

    <!-- Loading state -->
    <div v-if="status === 'pending'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <USkeleton v-for="i in 3" :key="i" class="h-40 rounded-lg" />
    </div>

    <!-- Projects grid -->
    <template v-else-if="hasProjects">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">Your Projects</h2>
        <NuxtLink to="/projects" class="text-sm text-(--ui-primary) hover:underline">
          View all
        </NuxtLink>
      </div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ProjectCard
          v-for="book in books?.slice(0, 6)"
          :key="book.id"
          :book="book"
        />
      </div>
    </template>

    <!-- Onboarding for first-time users -->
    <template v-else>
      <!-- Hero -->
      <div class="mt-8 mb-12 flex flex-col items-center text-center">
        <div class="mb-5 text-6xl opacity-20">
          <span class="i-lucide-book-open" />
        </div>
        <h2 class="text-2xl font-serif font-bold text-(--ui-text-highlighted)">
          Every great book starts here
        </h2>
        <p class="mt-3 max-w-lg text-sm text-(--ui-text-muted) leading-relaxed">
          Manuscrypt guides you from initial idea to polished manuscript. AI-powered tools help you develop characters,
          structure your plot, write with confidence, and refine your prose.
        </p>
        <UButton
          label="Start Your First Book"
          class="mt-6"
          size="lg"
          icon="i-lucide-pen-line"
          @click="showNewProject = true"
        />
      </div>

      <!-- Workflow Steps -->
      <div class="mb-12">
        <h3 class="mb-6 text-center text-sm font-semibold uppercase tracking-wider text-(--ui-text-dimmed)">
          How It Works
        </h3>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="step in workflowSteps"
            :key="step.number"
            class="rounded-lg border border-(--ui-border) p-5 transition-colors hover:bg-(--ui-bg-elevated)"
          >
            <div class="mb-3 flex items-center gap-3">
              <div class="flex size-8 items-center justify-center rounded-full bg-(--ui-bg-elevated) text-sm font-bold text-(--ui-primary)">
                {{ step.number }}
              </div>
              <span :class="[step.icon, 'size-5 text-(--ui-text-dimmed)']" />
            </div>
            <h4 class="mb-1 text-sm font-semibold text-(--ui-text-highlighted)">
              {{ step.title }}
            </h4>
            <p class="text-xs text-(--ui-text-muted) leading-relaxed">
              {{ step.description }}
            </p>
          </div>
        </div>
      </div>

      <!-- Features highlight -->
      <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated) p-6 text-center">
        <h3 class="text-sm font-semibold text-(--ui-text-highlighted) mb-2">
          Powered by AI, Built for Writers
        </h3>
        <p class="text-xs text-(--ui-text-muted) max-w-lg mx-auto leading-relaxed">
          Character interviews that reveal your cast's inner world. Style analysis that understands your voice.
          Writing commands that continue your scene, deepen your prose, or craft natural dialogue.
          All in a distraction-free editor designed for deep creative work.
        </p>
      </div>
    </template>

    <NewProjectModal v-model="showNewProject" />
  </div>
</template>
