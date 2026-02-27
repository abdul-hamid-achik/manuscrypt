<script setup lang="ts">
import type { Scene, Character, Location } from '~~/shared/types'
import { moods } from '~/data/suggestions'

const props = defineProps<{
  scene?: Scene
  chapterId: string
  bookId: string
}>()

const emit = defineEmits<{
  saved: []
  cancelled: []
}>()

const createItem = { position: 'bottom' as const, when: 'always' as const }

const statuses = [
  { label: 'Planned', value: 'planned' },
  { label: 'Outlined', value: 'outlined' },
  { label: 'Drafting', value: 'drafting' },
  { label: 'Revising', value: 'revising' },
  { label: 'Done', value: 'done' },
]

const form = reactive({
  title: props.scene?.title ?? '',
  synopsis: props.scene?.synopsis ?? '',
  povCharacterId: props.scene?.povCharacterId ?? '',
  locationId: props.scene?.locationId ?? '',
  moodStart: props.scene?.moodStart ?? '',
  moodEnd: props.scene?.moodEnd ?? '',
  targetWordCount: props.scene?.targetWordCount ?? undefined as number | undefined,
  status: props.scene?.status ?? 'planned',
})

const toast = useToast()
const loading = ref(false)

const { data: charactersRaw } = useCharacters(props.bookId)
const { data: locationsRaw } = useLocations(props.bookId)

const characterOptions = computed(() => {
  const list = (charactersRaw.value as Character[] | null) ?? []
  return list.map(c => ({ label: c.name, value: c.id }))
})

const locationOptions = computed(() => {
  const list = (locationsRaw.value as Location[] | null) ?? []
  return list.map(l => ({ label: l.name, value: l.id }))
})

async function submit() {
  if (!form.title.trim()) return
  loading.value = true
  try {
    const data = {
      title: form.title.trim(),
      synopsis: form.synopsis.trim() || undefined,
      povCharacterId: form.povCharacterId || undefined,
      locationId: form.locationId || undefined,
      moodStart: form.moodStart || undefined,
      moodEnd: form.moodEnd || undefined,
      targetWordCount: form.targetWordCount || undefined,
      status: form.status,
    }
    if (props.scene) {
      await $fetch(`/api/scenes/${props.scene.id}`, {
        method: 'PUT',
        body: data,
      })
    } else {
      await $fetch('/api/scenes', {
        method: 'POST',
        body: { chapterId: props.chapterId, ...data },
      })
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
    <UFormField label="Title" required>
      <UInput
        v-model="form.title"
        placeholder="Scene title"
        autofocus
        class="w-full"
      />
    </UFormField>

    <UFormField label="Synopsis">
      <UTextarea
        v-model="form.synopsis"
        placeholder="What happens in this scene..."
        :rows="3"
        class="w-full"
      />
    </UFormField>

    <div class="grid grid-cols-2 gap-4">
      <UFormField label="POV Character">
        <USelect
          v-model="form.povCharacterId"
          :items="characterOptions"
          value-key="value"
          placeholder="Select character"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Location">
        <USelect
          v-model="form.locationId"
          :items="locationOptions"
          value-key="value"
          placeholder="Select location"
          class="w-full"
        />
      </UFormField>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Mood Start">
        <UInputMenu
          v-model="form.moodStart"
          :items="moods"
          :create-item="createItem"
          placeholder="Starting mood..."
          class="w-full"
        />
      </UFormField>

      <UFormField label="Mood End">
        <UInputMenu
          v-model="form.moodEnd"
          :items="moods"
          :create-item="createItem"
          placeholder="Ending mood..."
          class="w-full"
        />
      </UFormField>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <UFormField label="Target Word Count">
        <UInput
          v-model.number="form.targetWordCount"
          type="number"
          placeholder="e.g. 2000"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Status">
        <USelect
          v-model="form.status"
          :items="statuses"
          value-key="value"
          class="w-full"
        />
      </UFormField>
    </div>

    <div class="flex gap-3 pt-2">
      <UButton
        type="submit"
        :label="scene ? 'Update Scene' : 'Create Scene'"
        block
        :loading="loading"
        :disabled="!form.title.trim()"
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
