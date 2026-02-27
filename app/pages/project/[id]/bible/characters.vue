<script setup lang="ts">
import type { Character } from '~~/shared/types'

definePageMeta({ layout: 'default' })

const route = useRoute()
const projectId = route.params.id as string

const { data: characters, status, refresh } = useCharacters(projectId)
const characterList = computed(() => (characters.value as Character[] | null) ?? [])

const showForm = ref(false)
const editingCharacter = ref<Character | undefined>()

function openCreate() {
  editingCharacter.value = undefined
  showForm.value = true
}

function openEdit(character: Character) {
  editingCharacter.value = character
  showForm.value = true
}

async function onSaved() {
  showForm.value = false
  editingCharacter.value = undefined
  await refresh()
}

function onCancelled() {
  showForm.value = false
  editingCharacter.value = undefined
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-6 py-8 lg:px-8">
    <!-- Header -->
    <div class="mb-8 flex items-center justify-between">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <NuxtLink
            :to="`/project/${projectId}/bible`"
            class="text-sm text-(--ui-text-dimmed) hover:text-(--ui-text-muted)"
          >
            Story Bible
          </NuxtLink>
          <span class="text-(--ui-text-dimmed)">/</span>
        </div>
        <h1 class="text-2xl font-serif font-bold text-(--ui-text-highlighted) tracking-tight">
          Characters
        </h1>
        <p class="mt-1 text-sm text-(--ui-text-muted)">
          The cast that brings your story to life.
        </p>
      </div>
      <UButton
        label="Add Character"
        icon="i-lucide-plus"
        @click="openCreate"
      />
    </div>

    <!-- Loading -->
    <div v-if="status === 'pending'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <USkeleton v-for="i in 6" :key="i" class="h-40 rounded-lg" />
    </div>

    <!-- Grid -->
    <div
      v-else-if="characterList.length"
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <NuxtLink
        v-for="char in characterList"
        :key="char.id"
        :to="`/project/${projectId}/bible/character/${char.id}`"
      >
        <CharacterCard :character="char" />
      </NuxtLink>
    </div>

    <!-- Empty -->
    <div v-else class="mt-16 flex flex-col items-center text-center">
      <div class="mb-4 text-5xl opacity-30">
        <span class="i-lucide-users" />
      </div>
      <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">
        No characters yet
      </h2>
      <p class="mt-2 max-w-md text-sm text-(--ui-text-muted)">
        Every great story starts with compelling characters. Create your first to begin building your cast.
      </p>
      <UButton
        label="Create Your First Character"
        class="mt-6"
        size="lg"
        icon="i-lucide-plus"
        @click="openCreate"
      />
    </div>

    <!-- Relationships -->
    <div v-if="characterList.length >= 2" class="mt-12">
      <RelationshipManager
        :book-id="projectId"
        :characters="characterList"
      />
    </div>

    <!-- Create / Edit Slideover -->
    <USlideover
      v-model:open="showForm"
      :title="editingCharacter ? 'Edit Character' : 'New Character'"
      :description="editingCharacter ? 'Update this character\'s profile' : 'Add a new character to your story'"
    >
      <template #body>
        <CharacterForm
          :character="editingCharacter"
          :book-id="projectId"
          @saved="onSaved"
          @cancelled="onCancelled"
        />
      </template>
    </USlideover>
  </div>
</template>
