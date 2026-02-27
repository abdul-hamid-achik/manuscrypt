<script setup lang="ts">
import type { Character } from '~~/shared/types'

definePageMeta({ layout: 'default' })

const route = useRoute()
const projectId = route.params.id as string
const charId = route.params.charId as string

const { data: character, status, refresh } = useCharacter(charId)
const char = computed(() => character.value as Character | null)

const showEdit = ref(false)
const toast = useToast()
const showDelete = ref(false)
const showInterview = ref(false)
const deleting = ref(false)

const traits = computed(() => {
  if (!char.value?.traits) return []
  try {
    const parsed = JSON.parse(char.value.traits)
    if (Array.isArray(parsed)) return parsed
  } catch {
    // Fall back to comma-separated
  }
  return char.value.traits.split(',').map(t => t.trim()).filter(Boolean)
})

const roleColor = computed(() => {
  const colors: Record<string, string> = {
    protagonist: 'amber',
    antagonist: 'red',
    supporting: 'info',
    minor: 'neutral',
  }
  return colors[char.value?.role ?? ''] || 'neutral'
})

async function onSaved() {
  showEdit.value = false
  await refresh()
}

async function confirmDelete() {
  deleting.value = true
  try {
    await deleteCharacter(charId)
    await navigateTo(`/project/${projectId}/bible/characters`)
  } catch (e) {
    toast.add({ title: 'Error', description: e instanceof Error ? e.message : 'Something went wrong', color: 'error' })
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-6 py-8 lg:px-8">
    <!-- Loading -->
    <div v-if="status === 'pending'" class="space-y-4">
      <USkeleton class="h-8 w-48 rounded" />
      <USkeleton class="h-4 w-32 rounded" />
      <USkeleton class="h-64 rounded-lg" />
    </div>

    <!-- Not found -->
    <div v-else-if="!char" class="mt-16 text-center">
      <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">
        Character not found
      </h2>
      <UButton
        label="Back to Characters"
        variant="soft"
        class="mt-4"
        :to="`/project/${projectId}/bible/characters`"
      />
    </div>

    <!-- Character Detail -->
    <template v-else>
      <!-- Breadcrumb & Actions -->
      <div class="mb-6 flex items-start justify-between">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <NuxtLink
              :to="`/project/${projectId}/bible`"
              class="text-sm text-(--ui-text-dimmed) hover:text-(--ui-text-muted)"
            >
              Story Bible
            </NuxtLink>
            <span class="text-(--ui-text-dimmed)">/</span>
            <NuxtLink
              :to="`/project/${projectId}/bible/characters`"
              class="text-sm text-(--ui-text-dimmed) hover:text-(--ui-text-muted)"
            >
              Characters
            </NuxtLink>
            <span class="text-(--ui-text-dimmed)">/</span>
          </div>
          <h1 class="text-3xl font-serif font-bold text-(--ui-text-highlighted) tracking-tight">
            {{ char.name }}
          </h1>
          <div class="mt-2 flex items-center gap-2">
            <UBadge
              v-if="char.role"
              :color="roleColor as any"
              variant="subtle"
              class="capitalize"
            >
              {{ char.role }}
            </UBadge>
            <span v-if="char.age" class="text-sm text-(--ui-text-dimmed)">
              Age {{ char.age }}
            </span>
            <span
              v-if="char.archetype"
              class="text-sm italic text-(--ui-text-dimmed)"
            >
              &mdash; {{ char.archetype }}
            </span>
          </div>
        </div>

        <div class="flex gap-2 shrink-0">
          <UButton
            label="Interview"
            icon="i-lucide-message-circle"
            variant="soft"
            @click="showInterview = true"
          />
          <UButton
            label="Edit"
            icon="i-lucide-pencil"
            variant="outline"
            @click="showEdit = true"
          />
          <UButton
            icon="i-lucide-trash-2"
            variant="ghost"
            color="error"
            @click="showDelete = true"
          />
        </div>
      </div>

      <!-- Profile Fields -->
      <div class="space-y-6">
        <!-- Description -->
        <UCard v-if="char.description">
          <div>
            <h3 class="text-xs font-semibold uppercase tracking-wider text-(--ui-text-dimmed) mb-2">
              Description
            </h3>
            <p class="text-sm text-(--ui-text) leading-relaxed whitespace-pre-line">
              {{ char.description }}
            </p>
          </div>
        </UCard>

        <!-- Inner Life -->
        <div class="grid gap-4 sm:grid-cols-2">
          <UCard v-if="char.motivation">
            <div>
              <h3 class="text-xs font-semibold uppercase tracking-wider text-(--ui-text-dimmed) mb-2">
                Motivation
              </h3>
              <p class="text-sm text-(--ui-text) leading-relaxed whitespace-pre-line">
                {{ char.motivation }}
              </p>
            </div>
          </UCard>

          <UCard v-if="char.fear">
            <div>
              <h3 class="text-xs font-semibold uppercase tracking-wider text-(--ui-text-dimmed) mb-2">
                Fear
              </h3>
              <p class="text-sm text-(--ui-text) leading-relaxed whitespace-pre-line">
                {{ char.fear }}
              </p>
            </div>
          </UCard>
        </div>

        <UCard v-if="char.contradiction">
          <div>
            <h3 class="text-xs font-semibold uppercase tracking-wider text-(--ui-text-dimmed) mb-2">
              Contradiction
            </h3>
            <p class="text-sm text-(--ui-text) leading-relaxed whitespace-pre-line">
              {{ char.contradiction }}
            </p>
          </div>
        </UCard>

        <!-- Voice & Traits -->
        <div class="grid gap-4 sm:grid-cols-2">
          <UCard v-if="char.voiceNotes">
            <div>
              <h3 class="text-xs font-semibold uppercase tracking-wider text-(--ui-text-dimmed) mb-2">
                Voice Notes
              </h3>
              <p class="text-sm text-(--ui-text) leading-relaxed italic whitespace-pre-line">
                {{ char.voiceNotes }}
              </p>
            </div>
          </UCard>

          <UCard v-if="traits.length">
            <div>
              <h3 class="text-xs font-semibold uppercase tracking-wider text-(--ui-text-dimmed) mb-2">
                Traits
              </h3>
              <div class="flex flex-wrap gap-1.5">
                <UBadge
                  v-for="trait in traits"
                  :key="trait"
                  variant="subtle"
                  size="sm"
                >
                  {{ trait }}
                </UBadge>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Backstory -->
        <UCard v-if="char.backstory">
          <div>
            <h3 class="text-xs font-semibold uppercase tracking-wider text-(--ui-text-dimmed) mb-2">
              Backstory
            </h3>
            <p class="text-sm text-(--ui-text) leading-relaxed whitespace-pre-line font-serif">
              {{ char.backstory }}
            </p>
          </div>
        </UCard>
      </div>

      <!-- Edit Slideover -->
      <USlideover
        v-model:open="showEdit"
        title="Edit Character"
        description="Update this character's profile"
      >
        <template #body>
          <CharacterForm
            :character="char"
            :book-id="projectId"
            @saved="onSaved"
            @cancelled="showEdit = false"
          />
        </template>
      </USlideover>

      <!-- Delete Confirmation -->
      <UModal v-model:open="showDelete" title="Delete Character" description="This action cannot be undone">
        <template #body>
          <p class="text-sm text-(--ui-text-muted)">
            Are you sure you want to delete <strong>{{ char.name }}</strong>?
            This action cannot be undone.
          </p>
        </template>
        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton
              label="Cancel"
              variant="ghost"
              @click="showDelete = false"
            />
            <UButton
              label="Delete"
              color="error"
              :loading="deleting"
              @click="confirmDelete"
            />
          </div>
        </template>
      </UModal>

      <!-- Interview Slideover -->
      <USlideover
        v-model:open="showInterview"
        :title="`Interview: ${char.name}`"
        description="Talk to this character in their own voice"
        side="right"
      >
        <template #body>
          <div class="h-[calc(100vh-8rem)]">
            <InterviewChat
              :book-id="projectId"
              :character-id="charId"
              :character-name="char.name"
            />
          </div>
        </template>
      </USlideover>
    </template>
  </div>
</template>
