export function useExport(bookId: MaybeRef<string>) {
  const isExporting = ref(false)
  const toast = useToast()

  async function withExportGuard(fn: () => Promise<void>) {
    isExporting.value = true
    try {
      await fn()
    } catch (e) {
      toast.add({
        title: 'Export Failed',
        description: e instanceof Error ? e.message : 'Could not export your manuscript. Please try again.',
        color: 'error',
      })
    } finally {
      isExporting.value = false
    }
  }

  async function exportMarkdown() {
    await withExportGuard(async () => {
      const result = await $fetch('/api/export/markdown', {
        method: 'POST',
        body: { bookId: toValue(bookId) },
      })
      downloadFile(result.markdown, result.filename, 'text/markdown')
    })
  }

  async function exportPlainText() {
    await withExportGuard(async () => {
      const result = await $fetch('/api/export/markdown', {
        method: 'POST',
        body: { bookId: toValue(bookId) },
      })
      const filename = result.filename.replace(/\.md$/, '.txt')
      const plainText = stripMarkdown(result.markdown)
      downloadFile(plainText, filename, 'text/plain')
    })
  }

  async function exportDocx(bookTitle?: string) {
    await withExportGuard(async () => {
      const buffer = await $fetch('/api/export/docx', {
        method: 'POST',
        body: { bookId: toValue(bookId) },
        responseType: 'arrayBuffer',
      }) as unknown as ArrayBuffer
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const filename = bookTitle
        ? `${bookTitle.replace(/[^a-zA-Z0-9]+/g, '-')}.docx`
        : 'manuscript.docx'
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  return { isExporting, exportMarkdown, exportPlainText, exportDocx }
}

export function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*>\s+/gm, '')
    .replace(/^---+$/gm, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/!\[.*?\]\(.+?\)/g, '')
    .replace(/\n{3,}/g, '\n\n')
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
