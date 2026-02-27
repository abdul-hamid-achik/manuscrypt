<script setup lang="ts">
import type { Character, Location } from '~~/shared/types'

definePageMeta({ layout: 'default' })

const route = useRoute()
const projectId = route.params.id as string

const { data: characters, status: charStatus } = useCharacters(projectId)
const { data: locations, status: locStatus } = useLocations(projectId)

const characterList = computed(() => (characters.value as Character[] | null) ?? [])
const locationList = computed(() => (locations.value as Location[] | null) ?? [])

const loading = computed(() => charStatus.value === 'pending' || locStatus.value === 'pending')
</script>

<template>
  <div class="mx-auto max-w-6xl px-6 py-8 lg:px-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-serif font-bold text-(--ui-text-highlighted) tracking-tight">
        Story Bible
      </h1>
      <p class="mt-1 text-sm text-(--ui-text-muted)">
        The living reference for your characters, locations, and world.
      </p>
    </div>

    <!-- Stats -->
    <div v-if="!loading" class="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-(--ui-primary)">
            {{ characterList.length }}
          </p>
          <p class="text-xs text-(--ui-text-dimmed) mt-1">Characters</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-(--ui-primary)">
            {{ locationList.length }}
          </p>
          <p class="text-xs text-(--ui-text-dimmed) mt-1">Locations</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-(--ui-text-muted)">
            {{ characterList.filter(c => c.role === 'protagonist').length }}
          </p>
          <p class="text-xs text-(--ui-text-dimmed) mt-1">Protagonists</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-(--ui-text-muted)">
            {{ characterList.filter(c => c.role === 'antagonist').length }}
          </p>
          <p class="text-xs text-(--ui-text-dimmed) mt-1">Antagonists</p>
        </div>
      </UCard>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-8">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <USkeleton v-for="i in 3" :key="i" class="h-36 rounded-lg" />
      </div>
    </div>

    <template v-else>
      <!-- Characters Section -->
      <section class="mb-10">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">
            Characters
          </h2>
          <NuxtLink
            :to="`/project/${projectId}/bible/characters`"
            class="text-sm text-(--ui-primary) hover:underline"
          >
            View All
          </NuxtLink>
        </div>

        <div
          v-if="characterList.length"
          class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <NuxtLink
            v-for="char in characterList.slice(0, 6)"
            :key="char.id"
            :to="`/project/${projectId}/bible/character/${char.id}`"
          >
            <CharacterCard :character="char" />
          </NuxtLink>
        </div>

        <div v-else class="rounded-lg border border-dashed border-(--ui-border) p-8 text-center">
          <p class="text-sm text-(--ui-text-dimmed)">
            No characters yet. Build your cast to bring your story to life.
          </p>
          <UButton
            label="Add Character"
            variant="soft"
            size="sm"
            icon="i-lucide-plus"
            class="mt-3"
            :to="`/project/${projectId}/bible/characters`"
          />
        </div>
      </section>

      <!-- Locations Section -->
      <section class="mb-10">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">
            Locations
          </h2>
          <NuxtLink
            :to="`/project/${projectId}/bible/locations`"
            class="text-sm text-(--ui-primary) hover:underline"
          >
            View All
          </NuxtLink>
        </div>

        <div
          v-if="locationList.length"
          class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <NuxtLink
            v-for="loc in locationList.slice(0, 6)"
            :key="loc.id"
            :to="`/project/${projectId}/bible/locations`"
          >
            <LocationCard :location="loc" />
          </NuxtLink>
        </div>

        <div v-else class="rounded-lg border border-dashed border-(--ui-border) p-8 text-center">
          <p class="text-sm text-(--ui-text-dimmed)">
            No locations yet. Ground your story in vivid, memorable places.
          </p>
          <UButton
            label="Add Location"
            variant="soft"
            size="sm"
            icon="i-lucide-plus"
            class="mt-3"
            :to="`/project/${projectId}/bible/locations`"
          />
        </div>
      </section>

      <!-- Timeline Link -->
      <section>
        <NuxtLink :to="`/project/${projectId}/bible/timeline`">
          <UCard class="transition-colors duration-200 hover:ring-(--ui-primary)/40">
            <div class="flex items-center gap-4">
              <div class="flex size-10 items-center justify-center rounded-lg bg-(--ui-bg-elevated)">
                <UIcon name="i-lucide-git-branch" class="text-lg text-(--ui-primary)" />
              </div>
              <div>
                <h3 class="font-semibold text-(--ui-text-highlighted)">Timeline</h3>
                <p class="text-sm text-(--ui-text-dimmed)">
                  Visualize the chronological order of events in your story
                </p>
              </div>
            </div>
          </UCard>
        </NuxtLink>
      </section>
    </template>
  </div>
</template>
