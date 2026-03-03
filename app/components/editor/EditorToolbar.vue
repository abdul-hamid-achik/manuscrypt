<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3"

const props = defineProps<{
  editor: Editor
}>()

const emit = defineEmits<{
  toggleSearch: []
  toggleVersionHistory: []
}>()

const items = computed(() => [
  {
    icon: "i-lucide-undo-2",
    label: "Undo",
    action: () => props.editor.chain().focus().undo().run(),
    active: false,
    disabled: !props.editor.can().undo(),
  },
  {
    icon: "i-lucide-redo-2",
    label: "Redo",
    action: () => props.editor.chain().focus().redo().run(),
    active: false,
    disabled: !props.editor.can().redo(),
  },
  { type: "separator" as const },
  {
    icon: "i-lucide-bold",
    label: "Bold",
    action: () => props.editor.chain().focus().toggleBold().run(),
    active: props.editor.isActive("bold"),
  },
  {
    icon: "i-lucide-italic",
    label: "Italic",
    action: () => props.editor.chain().focus().toggleItalic().run(),
    active: props.editor.isActive("italic"),
  },
  { type: "separator" as const },
  {
    icon: "i-lucide-heading-1",
    label: "Heading 1",
    action: () => props.editor.chain().focus().toggleHeading({ level: 1 }).run(),
    active: props.editor.isActive("heading", { level: 1 }),
  },
  {
    icon: "i-lucide-heading-2",
    label: "Heading 2",
    action: () => props.editor.chain().focus().toggleHeading({ level: 2 }).run(),
    active: props.editor.isActive("heading", { level: 2 }),
  },
  {
    icon: "i-lucide-heading-3",
    label: "Heading 3",
    action: () => props.editor.chain().focus().toggleHeading({ level: 3 }).run(),
    active: props.editor.isActive("heading", { level: 3 }),
  },
  { type: "separator" as const },
  {
    icon: "i-lucide-text-quote",
    label: "Blockquote",
    action: () => props.editor.chain().focus().toggleBlockquote().run(),
    active: props.editor.isActive("blockquote"),
  },
  {
    icon: "i-lucide-minus",
    label: "Horizontal Rule",
    action: () => props.editor.chain().focus().setHorizontalRule().run(),
    active: false,
  },
])
</script>

<template>
  <div class="flex items-center gap-0.5 px-4 py-2 border-b border-(--ui-border)">
    <template v-for="(item, index) in items" :key="index">
      <div
        v-if="'type' in item && item.type === 'separator'"
        class="w-px h-5 bg-(--ui-border) mx-1"
      />
      <UButton
        v-else-if="'action' in item"
        :icon="item.icon"
        variant="ghost"
        size="xs"
        :color="item.active ? 'primary' : 'neutral'"
        :disabled="'disabled' in item ? item.disabled : false"
        :aria-label="item.label"
        @click="() => void item.action()"
      />
    </template>

    <div class="ml-auto flex items-center gap-0.5">
      <UButton
        icon="i-lucide-search"
        variant="ghost"
        size="xs"
        color="neutral"
        aria-label="Find and replace"
        @click="emit('toggleSearch')"
      />
      <UButton
        icon="i-lucide-clock"
        variant="ghost"
        size="xs"
        color="neutral"
        aria-label="Version history"
        @click="emit('toggleVersionHistory')"
      />
    </div>
  </div>
</template>
