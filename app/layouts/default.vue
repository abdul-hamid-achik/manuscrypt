<script setup lang="ts">
const route = useRoute()
const sidebarOpen = useState<boolean>('sidebarOpen', () => false)

watch(() => route.path, () => {
  sidebarOpen.value = false
})
</script>

<template>
  <div class="flex h-dvh overflow-hidden bg-(--ui-bg)">
    <!-- Backdrop overlay (mobile only) -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      leave-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-30 bg-black/50 lg:hidden"
        @click="sidebarOpen = false"
      />
    </Transition>

    <!-- Sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-(--ui-border) bg-(--ui-bg-elevated)/50 overflow-y-auto transform transition-transform duration-300 lg:static lg:translate-x-0"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <AppSidebar />
    </aside>

    <!-- Main area -->
    <div class="flex flex-1 flex-col min-w-0">
      <AppHeader />
      <main class="flex-1 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
</template>
