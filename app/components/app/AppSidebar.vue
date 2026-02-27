<script setup lang="ts">
const route = useRoute()

const projectId = computed(() => {
  const id = route.params.id as string | undefined
  if (id) return id
  // Also match nested routes like /project/:id/bible
  const match = route.path.match(/^\/project\/([^/]+)/)
  return match?.[1] ?? null
})

const projectNav = computed(() => {
  if (!projectId.value) return []
  const base = `/project/${projectId.value}`
  return [
    { label: 'Overview', to: base, icon: 'i-lucide-layout-dashboard' },
    {
      label: 'Story Bible',
      icon: 'i-lucide-book-open',
      to: `${base}/bible`,
      children: [
        { label: 'Characters', to: `${base}/bible/characters` },
        { label: 'Locations', to: `${base}/bible/locations` },
        { label: 'Timeline', to: `${base}/bible/timeline` },
      ],
    },
    { label: 'Outline', to: `${base}/outline`, icon: 'i-lucide-list-tree' },
    { label: 'Write', to: `${base}/write`, icon: 'i-lucide-pen-line' },
    { label: 'Style Workshop', to: `${base}/style`, icon: 'i-lucide-sparkles' },
    { label: 'Review', to: `${base}/review`, icon: 'i-lucide-check-circle' },
    { label: 'Export', to: `${base}/export`, icon: 'i-lucide-download' },
    { label: 'Settings', to: `${base}/settings`, icon: 'i-lucide-settings' },
  ]
})
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Brand -->
    <div class="p-4 pb-2">
      <NuxtLink to="/" class="inline-flex">
        <AppLogo size="md" />
      </NuxtLink>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto px-2 py-2 space-y-1">
      <!-- Global links -->
      <NuxtLink
        to="/"
        class="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-(--ui-text-muted) transition-colors hover:bg-(--ui-bg-elevated) hover:text-(--ui-text-highlighted)"
        active-class="!bg-(--ui-bg-elevated) !text-(--ui-text-highlighted)"
      >
        <span class="i-lucide-home size-4 shrink-0" />
        The Study
      </NuxtLink>

      <NuxtLink
        to="/projects"
        class="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-(--ui-text-muted) transition-colors hover:bg-(--ui-bg-elevated) hover:text-(--ui-text-highlighted)"
        active-class="!bg-(--ui-bg-elevated) !text-(--ui-text-highlighted)"
      >
        <span class="i-lucide-library size-4 shrink-0" />
        Your Library
      </NuxtLink>

      <!-- Project-specific nav -->
      <template v-if="projectId">
        <div class="pt-4 pb-1 px-3">
          <span class="text-xs font-semibold uppercase tracking-wider text-(--ui-text-dimmed)">
            Project
          </span>
        </div>

        <template v-for="item in projectNav" :key="item.label">
          <!-- Items with children -->
          <template v-if="'children' in item && item.children">
            <NuxtLink
              v-if="item.to"
              :to="item.to"
              class="flex items-center gap-2.5 rounded-md px-3 pt-3 pb-1 text-xs font-medium text-(--ui-text-dimmed) transition-colors hover:text-(--ui-text-highlighted)"
            >
              <span v-if="item.icon" :class="[item.icon, 'size-3.5 shrink-0']" />
              {{ item.label }}
            </NuxtLink>
            <div v-else class="pt-2 pb-1 px-3">
              <span class="text-xs font-medium text-(--ui-text-dimmed)">{{ item.label }}</span>
            </div>
            <NuxtLink
              v-for="child in item.children"
              :key="child.label"
              :to="child.to"
              class="flex items-center gap-2.5 rounded-md pl-7 pr-3 py-1.5 text-sm text-(--ui-text-muted) transition-colors hover:bg-(--ui-bg-elevated) hover:text-(--ui-text-highlighted)"
              active-class="!bg-(--ui-bg-elevated) !text-(--ui-text-highlighted)"
            >
              {{ child.label }}
            </NuxtLink>
          </template>

          <!-- Simple items -->
          <NuxtLink
            v-else
            :to="item.to!"
            class="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-(--ui-text-muted) transition-colors hover:bg-(--ui-bg-elevated) hover:text-(--ui-text-highlighted)"
            active-class="!bg-(--ui-bg-elevated) !text-(--ui-text-highlighted)"
          >
            <span v-if="item.icon" :class="[item.icon, 'size-4 shrink-0']" />
            {{ item.label }}
          </NuxtLink>
        </template>
      </template>
    </nav>

    <!-- Bottom actions -->
    <div class="border-t border-(--ui-border) p-3 flex items-center justify-between">
      <NuxtLink
        to="/settings"
        class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-(--ui-text-muted) transition-colors hover:text-(--ui-text-highlighted)"
      >
        <span class="i-lucide-settings size-4" />
        Settings
      </NuxtLink>
      <ColorModeToggle />
    </div>
  </div>
</template>
