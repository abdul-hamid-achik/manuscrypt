<script setup lang="ts">
import type { Location } from '~~/shared/types'
import { emotionalTones } from '~/data/suggestions'

const props = defineProps<{
  location?: Location
  bookId: string
}>()

const emit = defineEmits<{
  saved: []
  cancelled: []
}>()

const createItem = { position: 'bottom' as const, when: 'always' as const }

const form = reactive({
  name: props.location?.name ?? '',
  description: props.location?.description ?? '',
  sensoryDetails: props.location?.sensoryDetails ?? '',
  emotionalTone: props.location?.emotionalTone ?? '',
})

const toast = useToast()
const loading = ref(false)

async function submit() {
  if (!form.name.trim()) return
  loading.value = true
  try {
    if (props.location) {
      await updateLocation(props.location.id, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        sensoryDetails: form.sensoryDetails.trim() || undefined,
        emotionalTone: form.emotionalTone || undefined,
      })
    } else {
      await createLocation({
        bookId: props.bookId,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        sensoryDetails: form.sensoryDetails.trim() || undefined,
        emotionalTone: form.emotionalTone || undefined,
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
    <UFormField label="Name" required>
      <UInput
        v-model="form.name"
        placeholder="Location name"
        autofocus
        class="w-full"
      />
    </UFormField>

    <UFormField label="Description">
      <UTextarea
        v-model="form.description"
        placeholder="What does this place look like? What's its significance?"
        :rows="3"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Sensory Details">
      <UTextarea
        v-model="form.sensoryDetails"
        placeholder="Sounds, smells, textures, temperature, light..."
        :rows="3"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Emotional Tone">
      <UInputMenu
        v-model="form.emotionalTone"
        :items="emotionalTones"
        :create-item="createItem"
        placeholder="Search or type custom..."
        class="w-full"
      />
    </UFormField>

    <div class="flex gap-3 pt-2">
      <UButton
        type="submit"
        :label="location ? 'Update Location' : 'Create Location'"
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
