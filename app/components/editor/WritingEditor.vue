<script setup lang="ts">
import { EditorContent } from "@tiptap/vue-3"

const props = withDefaults(defineProps<{
  chapterId: string
  focusMode?: boolean
}>(), {
  focusMode: false,
})

const chapterIdRef = toRef(props, "chapterId")
const {
  editor,
  wordCount,
  characterCount,
  saveStatus,
  loadContent,
  getSelectedText,
  getTrailingText,
  insertAtCursor,
  replaceSelection,
  hasDraftRecovery,
  recoverDraft,
  dismissRecovery,
} = useWritingEditor(chapterIdRef)

onMounted(() => {
  loadContent()
})

defineExpose({
  getSelectedText,
  getTrailingText,
  insertAtCursor,
  replaceSelection,
  wordCount,
  characterCount,
  saveStatus,
  editor,
  hasDraftRecovery,
  recoverDraft,
  dismissRecovery,
})
</script>

<template>
  <div class="flex flex-col h-full">
    <EditorToolbar v-if="editor && !focusMode" :editor="editor" />
    <div class="flex-1 overflow-y-auto writing-area px-8" :class="focusMode ? 'py-12' : 'py-6'">
      <div class="max-w-[65ch] mx-auto">
        <EditorContent
          v-if="editor"
          :editor="editor"
          class="min-h-full font-serif text-lg leading-relaxed"
        />
      </div>
    </div>
    <EditorStatusBar
      v-if="!focusMode"
      :word-count="wordCount"
      :character-count="characterCount"
      :save-status="saveStatus"
    />
  </div>
</template>
