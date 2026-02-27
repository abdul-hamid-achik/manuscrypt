<script setup lang="ts">
const emit = defineEmits<{
  command: [cmd: string]
}>()

const isOpen = ref(false)

const commands = [
  {
    id: "continue",
    label: "Continue Writing",
    description: "Continue the narrative from where you left off",
    icon: "i-lucide-pen-line",
    shortcut: "/continue",
  },
  {
    id: "deepen",
    label: "Deepen Passage",
    description: "Add psychological depth and literary richness",
    icon: "i-lucide-layers",
    shortcut: "/deepen",
  },
  {
    id: "dialogue",
    label: "Generate Dialogue",
    description: "Create authentic character dialogue",
    icon: "i-lucide-message-square",
    shortcut: "/dialogue",
  },
  {
    id: "sensory",
    label: "Add Sensory Details",
    description: "Enrich with sights, sounds, smells, textures",
    icon: "i-lucide-eye",
    shortcut: "/sensory",
  },
]

function selectCommand(cmd: string) {
  isOpen.value = false
  emit("command", cmd)
}

function toggle() {
  isOpen.value = !isOpen.value
}

defineExpose({ toggle, isOpen })
</script>

<template>
  <div class="relative">
    <UButton
      icon="i-lucide-sparkles"
      label="AI"
      variant="soft"
      size="sm"
      @click="toggle"
    />

    <div
      v-if="isOpen"
      class="absolute bottom-full mb-2 right-0 w-72 bg-(--ui-bg) border border-(--ui-border) rounded-lg shadow-lg overflow-hidden z-50"
    >
      <div class="p-2 border-b border-(--ui-border)">
        <p class="text-xs font-medium text-(--ui-text-dimmed)">AI Commands</p>
      </div>
      <div class="p-1">
        <button
          v-for="cmd in commands"
          :key="cmd.id"
          class="w-full flex items-start gap-3 p-2 rounded-md hover:bg-(--ui-bg-elevated) transition-colors text-left"
          @click="selectCommand(cmd.id)"
        >
          <UIcon :name="cmd.icon" class="text-lg mt-0.5 text-(--ui-primary)" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-(--ui-text-highlighted)">
              {{ cmd.label }}
            </p>
            <p class="text-xs text-(--ui-text-dimmed)">
              {{ cmd.description }}
            </p>
          </div>
          <span class="text-xs text-(--ui-text-muted) font-mono mt-0.5">
            {{ cmd.shortcut }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
