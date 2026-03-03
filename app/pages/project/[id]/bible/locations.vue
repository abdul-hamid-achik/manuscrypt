<script setup lang="ts">
import type { Location } from '~~/shared/types'

definePageMeta({ layout: 'default' })

const route = useRoute()
const projectId = route.params.id as string

const { data: locations, status, refresh } = useLocations(projectId)
const locationList = computed(() => (locations.value as Location[] | null) ?? [])

const showForm = ref(false)
const editingLocation = ref<Location | undefined>()

function openCreate() {
  editingLocation.value = undefined
  showForm.value = true
}

function openEdit(location: Location) {
  editingLocation.value = location
  showForm.value = true
}

async function onSaved() {
  showForm.value = false
  editingLocation.value = undefined
  await refresh()
}

function onCancelled() {
  showForm.value = false
  editingLocation.value = undefined
}

const toast = useToast()

const showDeleteModal = ref(false)
const pendingDeleteId = ref<string | null>(null)

function handleDeleteLocation(id: string) {
  pendingDeleteId.value = id
  showDeleteModal.value = true
}

async function confirmDeleteLocation() {
  if (!pendingDeleteId.value) return
  try {
    await $fetch(`/api/locations/${pendingDeleteId.value}` as string, { method: 'DELETE' })
    await refresh()
  } catch (e) {
    toast.add({ title: 'Error', description: e instanceof Error ? e.message : 'Could not delete location', color: 'error' })
  } finally {
    showDeleteModal.value = false
    pendingDeleteId.value = null
  }
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
          Locations
        </h1>
        <p class="mt-1 text-sm text-(--ui-text-muted)">
          The places that ground your story in the world.
        </p>
      </div>
      <UButton
        label="Add Location"
        icon="i-lucide-plus"
        @click="openCreate"
      />
    </div>

    <!-- Loading -->
    <div v-if="status === 'pending'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <USkeleton v-for="i in 6" :key="i" class="h-36 rounded-lg" />
    </div>

    <!-- Grid -->
    <div
      v-else-if="locationList.length"
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div
        v-for="loc in locationList"
        :key="loc.id"
        class="relative group"
      >
        <div class="cursor-pointer" @click="openEdit(loc)">
          <LocationCard :location="loc" />
        </div>
        <UButton
          icon="i-lucide-trash-2"
          size="xs"
          variant="ghost"
          color="error"
          class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          @click.stop="handleDeleteLocation(loc.id)"
        />
      </div>
    </div>

    <!-- Empty -->
    <div v-else class="mt-16 flex flex-col items-center text-center">
      <div class="mb-4 text-5xl opacity-30">
        <span class="i-lucide-map-pin" />
      </div>
      <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">
        No locations yet
      </h2>
      <p class="mt-2 max-w-md text-sm text-(--ui-text-muted)">
        Great settings make stories unforgettable. Create your first location to start building your world.
      </p>
      <UButton
        label="Create Your First Location"
        class="mt-6"
        size="lg"
        icon="i-lucide-plus"
        @click="openCreate"
      />
    </div>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #header>
        <h3 class="text-lg font-semibold text-(--ui-text-highlighted)">Delete Location</h3>
      </template>
      <template #body>
        <p class="text-sm text-(--ui-text-muted)">
          Are you sure you want to delete this location? This cannot be undone.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton label="Cancel" variant="ghost" @click="showDeleteModal = false" />
          <UButton label="Delete" color="error" @click="confirmDeleteLocation" />
        </div>
      </template>
    </UModal>

    <!-- Create / Edit Slideover -->
    <USlideover
      v-model:open="showForm"
      :title="editingLocation ? 'Edit Location' : 'New Location'"
      :description="editingLocation ? 'Update this location\'s details' : 'Add a new location to your world'"
    >
      <template #body>
        <LocationForm
          :location="editingLocation"
          :book-id="projectId"
          @saved="onSaved"
          @cancelled="onCancelled"
        />
      </template>
    </USlideover>
  </div>
</template>
