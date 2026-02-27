<script setup lang="ts">
import type { Character } from '~~/shared/types'
import { archetypes, traits as traitSuggestions, motivations, fears, voiceStyles } from '~/data/suggestions'

const props = defineProps<{
  character?: Character
  bookId: string
}>()

const emit = defineEmits<{
  saved: []
  cancelled: []
}>()

const roles = ['protagonist', 'antagonist', 'supporting', 'minor']

const createItem = { position: 'bottom' as const, when: 'always' as const }

function parseTraits(raw: string | null | undefined): string[] {
  if (!raw) return []
  return raw.split(',').map(t => t.trim()).filter(Boolean)
}

const form = reactive({
  name: props.character?.name ?? '',
  role: props.character?.role ?? '',
  age: props.character?.age ?? '',
  archetype: props.character?.archetype ?? '',
  description: props.character?.description ?? '',
  motivation: props.character?.motivation ?? '',
  fear: props.character?.fear ?? '',
  contradiction: props.character?.contradiction ?? '',
  voiceNotes: props.character?.voiceNotes ?? '',
  traits: parseTraits(props.character?.traits),
  backstory: props.character?.backstory ?? '',
})

const toast = useToast()
const loading = ref(false)

function serializeTraits(): string | undefined {
  const joined = form.traits.join(', ')
  return joined || undefined
}

async function submit() {
  if (!form.name.trim()) return
  loading.value = true
  try {
    const data = {
      name: form.name.trim(),
      role: form.role || undefined,
      age: form.age.trim() || undefined,
      archetype: form.archetype || undefined,
      description: form.description.trim() || undefined,
      motivation: form.motivation || undefined,
      fear: form.fear || undefined,
      contradiction: form.contradiction.trim() || undefined,
      voiceNotes: form.voiceNotes || undefined,
      traits: serializeTraits(),
      backstory: form.backstory.trim() || undefined,
    }
    if (props.character) {
      await updateCharacter(props.character.id, data)
    } else {
      await createCharacter({ bookId: props.bookId, ...data })
    }
    emit('saved')
  } catch (e) {
    toast.add({ title: 'Error', description: e instanceof Error ? e.message : 'Something went wrong', color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="submit">
    <UFormField label="Name" required>
      <UInput
        v-model="form.name"
        placeholder="Character name"
        autofocus
        class="w-full"
      />
    </UFormField>

    <UFormField label="Role">
      <USelect
        v-model="form.role"
        :items="roles"
        placeholder="Select a role"
        class="w-full"
      />
    </UFormField>

    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Age">
        <UInput
          v-model="form.age"
          placeholder="e.g. 34"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Archetype">
        <UInputMenu
          v-model="form.archetype"
          :items="archetypes"
          :create-item="createItem"
          placeholder="Search or type custom..."
          class="w-full"
        />
      </UFormField>
    </div>

    <UFormField label="Description">
      <UTextarea
        v-model="form.description"
        placeholder="Physical appearance, mannerisms, first impression..."
        :rows="3"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Motivation">
      <UInputMenu
        v-model="form.motivation"
        :items="motivations"
        :create-item="createItem"
        placeholder="Search or type custom..."
        class="w-full"
      />
    </UFormField>

    <UFormField label="Fear">
      <UInputMenu
        v-model="form.fear"
        :items="fears"
        :create-item="createItem"
        placeholder="Search or type custom..."
        class="w-full"
      />
    </UFormField>

    <UFormField label="Contradiction">
      <UTextarea
        v-model="form.contradiction"
        placeholder="Their internal conflict or inconsistency"
        :rows="2"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Voice Notes">
      <UInputMenu
        v-model="form.voiceNotes"
        :items="voiceStyles"
        :create-item="createItem"
        placeholder="Search or type custom..."
        class="w-full"
      />
    </UFormField>

    <UFormField label="Traits">
      <UInputMenu
        v-model="form.traits"
        :items="traitSuggestions"
        multiple
        :create-item="createItem"
        placeholder="Search or type custom..."
        class="w-full"
      />
    </UFormField>

    <UFormField label="Backstory">
      <UTextarea
        v-model="form.backstory"
        placeholder="Key events that shaped who they are..."
        :rows="4"
        class="w-full"
      />
    </UFormField>

    <div class="flex gap-3 pt-2">
      <UButton
        type="submit"
        :label="character ? 'Update Character' : 'Create Character'"
        block
        :loading="loading"
        :disabled="!form.name.trim()"
        class="flex-1"
      />
      <UButton
        label="Cancel"
        variant="ghost"
        @click="emit('cancelled')"
      />
    </div>
  </form>
</template>
