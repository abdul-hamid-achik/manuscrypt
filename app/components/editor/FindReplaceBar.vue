<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3"

const props = defineProps<{
  editor: Editor
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const searchTerm = ref("")
const replaceTerm = ref("")
const findInputRef = ref<{ inputRef?: { el?: HTMLInputElement } } | null>(null)

const storage = computed(() => props.editor.storage.searchAndReplace)
const matchCount = computed(() => storage.value.results.length)
const currentIndex = computed(() => storage.value.currentIndex)

const matchDisplay = computed(() => {
  if (!searchTerm.value) return ""
  if (matchCount.value === 0) return "0 results"
  return `${currentIndex.value + 1} of ${matchCount.value}`
})

watch(searchTerm, (val) => {
  props.editor.commands.setSearchTerm(val)
})

watch(replaceTerm, (val) => {
  props.editor.commands.setReplaceTerm(val)
})

watch(() => props.visible, (val) => {
  if (val) {
    nextTick(() => {
      findInputRef.value?.inputRef?.el?.focus()
    })
  } else {
    searchTerm.value = ""
    replaceTerm.value = ""
    props.editor.commands.setSearchTerm("")
  }
})

function findNext() {
  props.editor.commands.findNext()
}

function findPrevious() {
  props.editor.commands.findPrevious()
}

function replaceCurrentMatch() {
  props.editor.commands.replaceCurrent()
}

function replaceAllMatches() {
  props.editor.commands.replaceAll()
}

function close() {
  emit("close")
}

function onFindKeydown(e: KeyboardEvent) {
  if (e.key === "Enter") {
    e.preventDefault()
    if (e.shiftKey) {
      findPrevious()
    } else {
      findNext()
    }
  }
  if (e.key === "Escape") {
    e.preventDefault()
    close()
  }
}

function onReplaceKeydown(e: KeyboardEvent) {
  if (e.key === "Enter") {
    e.preventDefault()
    replaceCurrentMatch()
  }
  if (e.key === "Escape") {
    e.preventDefault()
    close()
  }
}
</script>

<template>
  <Transition name="slide-down">
    <div v-if="visible" class="border-b border-(--ui-border) bg-(--ui-bg-elevated) px-4 py-2">
      <div class="flex items-center gap-2">
        <!-- Find row -->
        <div class="flex items-center gap-2 flex-1">
          <UInput
            ref="findInputRef"
            v-model="searchTerm"
            placeholder="Find..."
            size="xs"
            class="w-48"
            @keydown="onFindKeydown"
          />
          <span v-if="searchTerm" class="text-xs text-(--ui-text-dimmed) whitespace-nowrap min-w-[5rem] text-center">
            {{ matchDisplay }}
          </span>
          <UButton
            icon="i-lucide-chevron-up"
            variant="ghost"
            size="xs"
            color="neutral"
            aria-label="Previous match"
            :disabled="matchCount === 0"
            @click="findPrevious"
          />
          <UButton
            icon="i-lucide-chevron-down"
            variant="ghost"
            size="xs"
            color="neutral"
            aria-label="Next match"
            :disabled="matchCount === 0"
            @click="findNext"
          />
        </div>

        <!-- Replace row -->
        <div class="flex items-center gap-2 flex-1">
          <UInput
            v-model="replaceTerm"
            placeholder="Replace..."
            size="xs"
            class="w-48"
            @keydown="onReplaceKeydown"
          />
          <UButton
            label="Replace"
            variant="soft"
            size="xs"
            color="neutral"
            :disabled="matchCount === 0"
            @click="replaceCurrentMatch"
          />
          <UButton
            label="Replace All"
            variant="soft"
            size="xs"
            color="neutral"
            :disabled="matchCount === 0"
            @click="replaceAllMatches"
          />
        </div>

        <!-- Close -->
        <UButton
          icon="i-lucide-x"
          variant="ghost"
          size="xs"
          color="neutral"
          aria-label="Close find and replace"
          @click="close"
        />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.15s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
