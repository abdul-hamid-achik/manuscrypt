<script setup lang="ts">
const route = useRoute()

const projectId = computed(() => {
  const id = route.params.id as string | undefined
  if (id) return id
  const match = route.path.match(/^\/project\/([^/]+)/)
  return match?.[1] ?? null
})

const breadcrumbItems = computed(() => {
  const items: { label: string; to?: string }[] = [{ label: 'The Study', to: '/' }]
  const segments = route.path.split('/').filter(Boolean)

  if (segments[0] === 'projects') {
    items.push({ label: 'Library' })
  } else if (segments[0] === 'project' && segments[1]) {
    items.push({ label: 'Library', to: '/projects' })
    // Project name will be resolved by the page; show generic label
    items.push({ label: route.meta.projectTitle as string || 'Project' })
    if (segments[2]) {
      const section = segments[2].charAt(0).toUpperCase() + segments[2].slice(1)
      items.push({ label: section })
    }
  } else if (segments[0] === 'settings') {
    items.push({ label: 'Settings' })
  }

  return items
})

const commandPaletteOpen = ref(false)
const searchModalOpen = ref(false)

function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    commandPaletteOpen.value = true
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'f' && projectId.value) {
    e.preventDefault()
    searchModalOpen.value = true
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <header class="flex h-14 items-center justify-between border-b border-(--ui-border) px-4 lg:px-6">
    <UBreadcrumb :items="breadcrumbItems" />

    <div class="flex items-center gap-2">
      <UButton
        v-if="projectId"
        variant="ghost"
        color="neutral"
        icon="i-lucide-file-search"
        size="sm"
        @click="searchModalOpen = true"
      >
        <template #trailing>
          <UKbd value="meta" size="sm" />
          <UKbd value="F" size="sm" />
        </template>
      </UButton>

      <UButton
        variant="ghost"
        color="neutral"
        icon="i-lucide-search"
        size="sm"
        @click="commandPaletteOpen = true"
      >
        <template #trailing>
          <UKbd value="meta" size="sm" />
          <UKbd value="K" size="sm" />
        </template>
      </UButton>

      <ColorModeToggle />
    </div>
  </header>

  <AppCommandPalette v-model:open="commandPaletteOpen" />
  <AppSearchModal v-model:open="searchModalOpen" />
</template>
