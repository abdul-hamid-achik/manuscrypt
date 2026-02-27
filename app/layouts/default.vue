<template>
  <div class="flex h-dvh overflow-hidden bg-(--ui-bg)">
    <!-- Sidebar -->
    <aside class="w-64 shrink-0 border-r border-(--ui-border) bg-(--ui-bg-elevated)/50 overflow-y-auto">
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
