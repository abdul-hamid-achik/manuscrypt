<script setup lang="ts">
definePageMeta({ layout: 'default' })
</script>

<template>
  <div class="mx-auto max-w-3xl px-6 py-8 lg:px-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-(--ui-text-highlighted) tracking-tight">
        Settings
      </h1>
      <p class="mt-1 text-sm text-(--ui-text-muted)">
        Configure your Manuscrypt experience.
      </p>
    </div>

    <div class="space-y-8">
      <!-- API Key Section -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <span class="i-lucide-key size-4 text-(--ui-primary)" />
            <h2 class="text-sm font-semibold text-(--ui-text-highlighted)">Anthropic API Key</h2>
          </div>
        </template>
        <p class="mb-3 text-sm text-(--ui-text-muted)">
          The API key is configured via environment variables for security. Set <code class="rounded bg-(--ui-bg-elevated) px-1.5 py-0.5 text-xs">NUXT_ANTHROPIC_API_KEY</code> in your <code class="rounded bg-(--ui-bg-elevated) px-1.5 py-0.5 text-xs">.env</code> file.
        </p>
        <UInput
          model-value="••••••••••••••••"
          disabled
          class="w-full"
          icon="i-lucide-lock"
        />
      </UCard>

      <!-- Theme Section -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <span class="i-lucide-palette size-4 text-(--ui-primary)" />
            <h2 class="text-sm font-semibold text-(--ui-text-highlighted)">Appearance</h2>
          </div>
        </template>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-(--ui-text-highlighted)">Color Mode</p>
            <p class="text-xs text-(--ui-text-dimmed)">Switch between light and dark themes</p>
          </div>
          <ColorModeToggle />
        </div>
      </UCard>

      <!-- About Section -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <span class="i-lucide-info size-4 text-(--ui-primary)" />
            <h2 class="text-sm font-semibold text-(--ui-text-highlighted)">About</h2>
          </div>
        </template>
        <div class="space-y-3 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-(--ui-text-muted)">Application</span>
            <span class="font-medium text-(--ui-text-highlighted)">Manuscrypt</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-(--ui-text-muted)">Version</span>
            <span class="font-medium text-(--ui-text-highlighted)">1.0.0</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-(--ui-text-muted)">Framework</span>
            <span class="font-medium text-(--ui-text-highlighted)">Nuxt 4</span>
          </div>
          <p class="pt-2 text-xs text-(--ui-text-dimmed)">
            An AI-powered manuscript writing environment. From premise to polished manuscript.
          </p>
        </div>
      </UCard>
    </div>
  </div>
</template>
