<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })
const router = useRouter()
const route = useRoute()

const projectId = computed(() => {
  const id = route.params.id as string | undefined
  if (id) return id
  const match = route.path.match(/^\/project\/([^/]+)/)
  return match?.[1] ?? null
})

const groups = computed(() => {
  const items: any[] = [
    {
      id: 'navigation',
      label: 'Navigation',
      items: [
        { id: 'home', label: 'The Study', icon: 'i-lucide-home', to: '/' },
        { id: 'projects', label: 'Your Library', icon: 'i-lucide-library', to: '/projects' },
        { id: 'settings', label: 'Settings', icon: 'i-lucide-settings', to: '/settings' },
      ],
    },
    {
      id: 'actions',
      label: 'Actions',
      items: [
        { id: 'new-project', label: 'New Project', icon: 'i-lucide-plus' },
      ],
    },
  ]

  if (projectId.value) {
    const base = `/project/${projectId.value}`
    items.splice(1, 0, {
      id: 'project',
      label: 'Project',
      items: [
        { id: 'overview', label: 'Overview', icon: 'i-lucide-layout-dashboard', to: base },
        { id: 'outline', label: 'Outline', icon: 'i-lucide-list-tree', to: `${base}/outline` },
        { id: 'write', label: 'Write', icon: 'i-lucide-pen-line', to: `${base}/write` },
        { id: 'characters', label: 'Characters', icon: 'i-lucide-users', to: `${base}/bible/characters` },
        { id: 'locations', label: 'Locations', icon: 'i-lucide-map-pin', to: `${base}/bible/locations` },
        { id: 'style', label: 'Style Workshop', icon: 'i-lucide-sparkles', to: `${base}/style` },
        { id: 'review', label: 'Review', icon: 'i-lucide-check-circle', to: `${base}/review` },
        { id: 'export', label: 'Export', icon: 'i-lucide-download', to: `${base}/export` },
        { id: 'project-settings', label: 'Project Settings', icon: 'i-lucide-settings', to: `${base}/settings` },
      ],
    })
  }

  return items
})

function onSelect(item: any) {
  open.value = false
  if (item.to) {
    router.push(item.to)
  } else if (item.id === 'new-project') {
    useState('showNewProjectModal').value = true
    router.push('/projects')
  }
}
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-xl' }">
    <template #content>
      <UCommandPalette
        :groups="groups"
        placeholder="Search or jump to..."
        class="h-80"
        @update:model-value="onSelect"
      />
    </template>
  </UModal>
</template>
