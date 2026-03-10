import { Extension, type Editor } from "@tiptap/core"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

interface SearchMatch {
  from: number
  to: number
}

export interface SearchAndReplaceStorage {
  searchTerm: string
  replaceTerm: string
  results: SearchMatch[]
  currentIndex: number
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    searchAndReplace: {
      setSearchTerm: (term: string) => ReturnType
      setReplaceTerm: (term: string) => ReturnType
      findNext: () => ReturnType
      findPrevious: () => ReturnType
      replaceCurrent: () => ReturnType
      replaceAll: () => ReturnType
    }
  }
}

const searchAndReplacePluginKey = new PluginKey("searchAndReplace")

function findMatches(doc: ProseMirrorNode, searchTerm: string): SearchMatch[] {
  if (!searchTerm) return []

  const results: SearchMatch[] = []
  const term = searchTerm.toLowerCase()

  doc.descendants((node, pos) => {
    if (!node.isText) return
    if (!node.text) return

    const text = node.text!.toLowerCase()
    let index = text.indexOf(term)
    while (index !== -1) {
      results.push({ from: pos + index, to: pos + index + searchTerm.length })
      index = text.indexOf(term, index + 1)
    }
  })

  return results
}

function scrollToMatch(editor: Editor, match: SearchMatch) {
  try {
    const dom = editor.view.domAtPos(match.from)
    if (dom?.node) {
      const el = dom.node instanceof HTMLElement ? dom.node : dom.node.parentElement
      el?.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  } catch {
    // position may be invalid
  }
}

export const SearchAndReplace = Extension.create<Record<string, never>, SearchAndReplaceStorage>({
  name: "searchAndReplace",

  addStorage() {
    return {
      searchTerm: "",
      replaceTerm: "",
      results: [],
      currentIndex: 0,
    }
  },

  addCommands() {
    return {
      setSearchTerm:
        (term: string) =>
        ({ editor }) => {
          editor.storage.searchAndReplace.searchTerm = term
          const results = findMatches(editor.state.doc, term)
          editor.storage.searchAndReplace.results = results
          editor.storage.searchAndReplace.currentIndex = results.length > 0 ? 0 : -1
          editor.view.dispatch(editor.state.tr)
          return true
        },

      setReplaceTerm:
        (term: string) =>
        ({ editor }) => {
          editor.storage.searchAndReplace.replaceTerm = term
          return true
        },

      findNext:
        () =>
        ({ editor }) => {
          const storage = editor.storage.searchAndReplace
          if (storage.results.length === 0) return false
          storage.currentIndex = (storage.currentIndex + 1) % storage.results.length
          const match = storage.results[storage.currentIndex]
          editor.view.dispatch(editor.state.tr)
          scrollToMatch(editor, match)
          return true
        },

      findPrevious:
        () =>
        ({ editor }) => {
          const storage = editor.storage.searchAndReplace
          if (storage.results.length === 0) return false
          storage.currentIndex =
            (storage.currentIndex - 1 + storage.results.length) % storage.results.length
          const match = storage.results[storage.currentIndex]
          editor.view.dispatch(editor.state.tr)
          scrollToMatch(editor, match)
          return true
        },

      replaceCurrent:
        () =>
        ({ editor, chain }) => {
          const storage = editor.storage.searchAndReplace
          if (storage.results.length === 0 || storage.currentIndex < 0) return false

          const match = storage.results[storage.currentIndex]
          chain()
            .insertContentAt({ from: match.from, to: match.to }, storage.replaceTerm)
            .run()

          // Re-find matches after replacement
          const results = findMatches(editor.state.doc, storage.searchTerm)
          storage.results = results
          if (results.length === 0) {
            storage.currentIndex = -1
          } else {
            storage.currentIndex = Math.min(storage.currentIndex, results.length - 1)
          }
          editor.view.dispatch(editor.state.tr)
          return true
        },

      replaceAll:
        () =>
        ({ editor }) => {
          const storage = editor.storage.searchAndReplace
          if (storage.results.length === 0) return false

          // Replace from end to start to preserve positions
          const { tr } = editor.state
          const sortedResults = [...storage.results].sort((a, b) => b.from - a.from)
          for (const match of sortedResults) {
            tr.insertText(storage.replaceTerm, match.from, match.to)
          }
          editor.view.dispatch(tr)

          // Re-find (should be empty)
          const results = findMatches(editor.state.doc, storage.searchTerm)
          storage.results = results
          storage.currentIndex = results.length > 0 ? 0 : -1
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    const storage = this.storage

    return [
      new Plugin({
        key: searchAndReplacePluginKey,
        props: {
          decorations(state) {
            if (!storage.searchTerm || storage.results.length === 0) {
              return DecorationSet.empty
            }

            const decorations: Decoration[] = []
            for (let i = 0; i < storage.results.length; i++) {
              const { from, to } = storage.results[i]!
              if (from < 0 || to > state.doc.content.size) continue
              const isActive = i === storage.currentIndex
              decorations.push(
                Decoration.inline(from, to, {
                  class: isActive ? "search-match search-match-active" : "search-match",
                }),
              )
            }

            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})
