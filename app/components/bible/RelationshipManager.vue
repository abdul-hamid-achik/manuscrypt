<script setup lang="ts">
import type { Character, CharacterRelationship } from '~~/shared/types'

const props = defineProps<{
  bookId: string
  characters: Character[]
}>()

const { data: relationships, status, refresh } = useRelationships(props.bookId)
const relationshipList = computed(() => (relationships.value as CharacterRelationship[] | null) ?? [])

const relationshipTypes = ['ally', 'rival', 'family', 'romantic', 'mentor', 'enemy', 'friend', 'servant', 'ruler']

const showForm = ref(false)
const editingRelationship = ref<CharacterRelationship | undefined>()
const loading = ref(false)
const toast = useToast()

const form = reactive({
  fromCharacterId: '',
  toCharacterId: '',
  relationshipType: '',
  description: '',
})

function resetForm() {
  form.fromCharacterId = ''
  form.toCharacterId = ''
  form.relationshipType = ''
  form.description = ''
}

function openCreate() {
  editingRelationship.value = undefined
  resetForm()
  showForm.value = true
}

function openEdit(rel: CharacterRelationship) {
  editingRelationship.value = rel
  form.fromCharacterId = rel.fromCharacterId
  form.toCharacterId = rel.toCharacterId
  form.relationshipType = rel.relationshipType
  form.description = rel.description ?? ''
  showForm.value = true
}

function onCancelled() {
  showForm.value = false
  editingRelationship.value = undefined
}

const characterOptions = computed(() =>
  props.characters.map(c => ({ label: c.name, value: c.id })),
)

function characterName(id: string): string {
  return props.characters.find(c => c.id === id)?.name ?? 'Unknown'
}

const typeColor = computed(() => {
  return (type: string) => {
    const colors: Record<string, string> = {
      ally: 'success',
      rival: 'warning',
      family: 'info',
      romantic: 'error',
      mentor: 'amber',
      enemy: 'red',
      friend: 'success',
      servant: 'neutral',
      ruler: 'neutral',
    }
    return colors[type] || 'neutral'
  }
})

async function submit() {
  if (!form.fromCharacterId || !form.toCharacterId || !form.relationshipType) return
  loading.value = true
  try {
    if (editingRelationship.value) {
      await updateRelationship(editingRelationship.value.id, {
        relationshipType: form.relationshipType,
        description: form.description.trim() || undefined,
      })
    } else {
      await createRelationship({
        bookId: props.bookId,
        fromCharacterId: form.fromCharacterId,
        toCharacterId: form.toCharacterId,
        relationshipType: form.relationshipType,
        description: form.description.trim() || undefined,
      })
    }
    showForm.value = false
    editingRelationship.value = undefined
    await refresh()
  } catch (e) {
    toast.add({ title: 'Error', description: e instanceof Error ? e.message : 'Something went wrong', color: 'error' })
  } finally {
    loading.value = false
  }
}

async function remove(rel: CharacterRelationship) {
  const confirmed = window.confirm('Delete this relationship? This cannot be undone.')
  if (!confirmed) return
  try {
    await deleteRelationship(rel.id)
    await refresh()
  } catch (e) {
    toast.add({ title: 'Error', description: e instanceof Error ? e.message : 'Could not delete relationship', color: 'error' })
  }
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h2 class="text-lg font-serif font-semibold text-(--ui-text-highlighted)">
          Relationships
        </h2>
        <p class="mt-0.5 text-sm text-(--ui-text-muted)">
          How your characters connect to one another.
        </p>
      </div>
      <UButton
        label="Add Relationship"
        icon="i-lucide-plus"
        size="sm"
        :disabled="characters.length < 2"
        @click="openCreate"
      />
    </div>

    <!-- Loading -->
    <div v-if="status === 'pending'" class="space-y-3">
      <USkeleton v-for="i in 3" :key="i" class="h-16 rounded-lg" />
    </div>

    <!-- List -->
    <div v-else-if="relationshipList.length" class="space-y-3">
      <UCard
        v-for="rel in relationshipList"
        :key="rel.id"
        class="transition-colors duration-200"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2 min-w-0">
            <span class="font-medium text-sm text-(--ui-text-highlighted) truncate">
              {{ characterName(rel.fromCharacterId) }}
            </span>
            <UIcon name="i-lucide-arrow-right" class="shrink-0 text-(--ui-text-dimmed)" />
            <span class="font-medium text-sm text-(--ui-text-highlighted) truncate">
              {{ characterName(rel.toCharacterId) }}
            </span>
            <UBadge
              :color="typeColor(rel.relationshipType) as any"
              variant="subtle"
              size="sm"
              class="capitalize shrink-0"
            >
              {{ rel.relationshipType }}
            </UBadge>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <UButton
              icon="i-lucide-pencil"
              variant="ghost"
              size="xs"
              color="neutral"
              @click="openEdit(rel)"
            />
            <UButton
              icon="i-lucide-trash-2"
              variant="ghost"
              size="xs"
              color="error"
              @click="remove(rel)"
            />
          </div>
        </div>
        <p
          v-if="rel.description"
          class="mt-2 text-sm text-(--ui-text-muted)"
        >
          {{ rel.description }}
        </p>
      </UCard>
    </div>

    <!-- Empty -->
    <div v-else class="mt-8 flex flex-col items-center text-center">
      <div class="mb-3 text-4xl opacity-30">
        <span class="i-lucide-link" />
      </div>
      <h3 class="text-sm font-semibold text-(--ui-text-highlighted)">
        No relationships yet
      </h3>
      <p class="mt-1 max-w-sm text-xs text-(--ui-text-muted)">
        Define how your characters relate to each other to keep track of alliances, rivalries, and bonds.
      </p>
      <UButton
        v-if="characters.length >= 2"
        label="Add First Relationship"
        class="mt-4"
        size="sm"
        icon="i-lucide-plus"
        @click="openCreate"
      />
      <p
        v-else
        class="mt-3 text-xs text-(--ui-text-dimmed)"
      >
        Create at least two characters to start defining relationships.
      </p>
    </div>

    <!-- Create / Edit Slideover -->
    <USlideover
      v-model:open="showForm"
      :title="editingRelationship ? 'Edit Relationship' : 'New Relationship'"
      :description="editingRelationship ? 'Update this relationship' : 'Define a connection between two characters'"
    >
      <template #body>
        <form class="space-y-5" @submit.prevent="submit">
          <UFormField label="From Character" required>
            <USelect
              v-model="form.fromCharacterId"
              :items="characterOptions"
              placeholder="Select a character"
              :disabled="!!editingRelationship"
              class="w-full"
            />
          </UFormField>

          <UFormField label="To Character" required>
            <USelect
              v-model="form.toCharacterId"
              :items="characterOptions"
              placeholder="Select a character"
              :disabled="!!editingRelationship"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Relationship Type" required>
            <USelect
              v-model="form.relationshipType"
              :items="relationshipTypes"
              placeholder="Select a type"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Description">
            <UTextarea
              v-model="form.description"
              placeholder="Describe this relationship..."
              :rows="3"
              class="w-full"
            />
          </UFormField>

          <div class="flex gap-3 pt-2">
            <UButton
              type="submit"
              :label="editingRelationship ? 'Update Relationship' : 'Create Relationship'"
              block
              :loading="loading"
              :disabled="!form.fromCharacterId || !form.toCharacterId || !form.relationshipType"
              class="flex-1"
            />
            <UButton
              label="Cancel"
              variant="ghost"
              @click="onCancelled"
            />
          </div>
        </form>
      </template>
    </USlideover>
  </div>
</template>
