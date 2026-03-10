import { describe, it, expect, vi, beforeEach } from "vitest"
import { ref } from "vue"

// Mock Nuxt auto-imports before importing the composable
const mockToastAdd = vi.fn()
vi.stubGlobal("useToast", () => ({ add: mockToastAdd }))
vi.stubGlobal("$fetch", vi.fn())
vi.stubGlobal("toValue", (v: unknown) =>
  typeof v === "object" && v !== null && "value" in v ? (v as { value: string }).value : v,
)
vi.stubGlobal("ref", ref)
vi.stubGlobal("MaybeRef", {})

// Mock browser APIs
const mockClick = vi.fn()
const OriginalURL = globalThis.URL
const mockCreateObjectURL = vi.fn(() => "blob:test-url")
const mockRevokeObjectURL = vi.fn()
OriginalURL.createObjectURL = mockCreateObjectURL
OriginalURL.revokeObjectURL = mockRevokeObjectURL
vi.stubGlobal("document", {
  createElement: vi.fn(() => ({ click: mockClick, href: "", download: "" })),
})
vi.stubGlobal(
  "Blob",
class MockBlob {
    constructor(public parts: ReadonlyArray<unknown>, public opts: BlobPropertyBag) {}
  }
)

const { useExport } = await import("../../../app/composables/useExport")

describe("useExport", () => {
  const bookId = ref("book-123")

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("exportMarkdown", () => {
    it("calls $fetch with correct endpoint and body", async () => {
      const mockFetch = vi.mocked($fetch)
      mockFetch.mockResolvedValueOnce({ markdown: "# Chapter 1\nContent", filename: "my-book.md" })

      const { exportMarkdown } = useExport(bookId)
      await exportMarkdown()

      expect(mockFetch).toHaveBeenCalledWith("/api/export/markdown", {
        method: "POST",
        body: { bookId: "book-123" },
      })
    })

    it("triggers download with markdown content and .md filename", async () => {
      vi.mocked($fetch).mockResolvedValueOnce({ markdown: "# Chapter 1", filename: "my-book.md" })

      const { exportMarkdown } = useExport(bookId)
      await exportMarkdown()

      expect(document.createElement).toHaveBeenCalledWith("a")
      expect(mockClick).toHaveBeenCalled()
      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:test-url")
    })

    it("sets isExporting to true during export and false after", async () => {
      const states: boolean[] = []
      vi.mocked($fetch).mockImplementationOnce(async () => {
        // Capture state during the fetch
        states.push(result.isExporting.value)
        return { markdown: "content", filename: "book.md" }
      })

      const result = useExport(bookId)
      expect(result.isExporting.value).toBe(false)

      await result.exportMarkdown()

      expect(states[0]).toBe(true) // was true during fetch
      expect(result.isExporting.value).toBe(false) // false after
    })

    it("shows toast on error", async () => {
      vi.mocked($fetch).mockRejectedValueOnce(new Error("Network error"))

      const { exportMarkdown } = useExport(bookId)
      await exportMarkdown()

      expect(mockToastAdd).toHaveBeenCalledWith({
        title: "Export Failed",
        description: "Network error",
        color: "error",
      })
    })
  })

  describe("exportPlainText", () => {
    it("calls $fetch and triggers download as .txt with stripped markdown", async () => {
      vi.mocked($fetch).mockResolvedValueOnce({ markdown: "## Title\n**bold**", filename: "my-book.md" })

      const { exportPlainText } = useExport(bookId)
      await exportPlainText()

      expect(vi.mocked($fetch)).toHaveBeenCalledWith("/api/export/markdown", {
        method: "POST",
        body: { bookId: "book-123" },
      })

      // Check download was triggered
      expect(document.createElement).toHaveBeenCalledWith("a")
      expect(mockClick).toHaveBeenCalled()
    })

    it("uses .txt extension instead of .md", async () => {
      const mockAnchor = { click: mockClick, href: "", download: "" }
      vi.mocked(document.createElement).mockReturnValueOnce(mockAnchor as unknown as HTMLAnchorElement)
      vi.mocked($fetch).mockResolvedValueOnce({ markdown: "content", filename: "my-book.md" })

      const { exportPlainText } = useExport(bookId)
      await exportPlainText()

      expect(mockAnchor.download).toBe("my-book.txt")
    })
  })

  describe("exportDocx", () => {
    it("calls $fetch with responseType arrayBuffer", async () => {
      vi.mocked($fetch).mockResolvedValueOnce(new ArrayBuffer(8))

      const { exportDocx } = useExport(bookId)
      await exportDocx()

      expect(vi.mocked($fetch)).toHaveBeenCalledWith("/api/export/docx", {
        method: "POST",
        body: { bookId: "book-123" },
        responseType: "arrayBuffer",
      })
    })

    it("creates blob and triggers download", async () => {
      vi.mocked($fetch).mockResolvedValueOnce(new ArrayBuffer(8))

      const { exportDocx } = useExport(bookId)
      await exportDocx()

      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:test-url")
    })

    it("uses custom bookTitle for filename", async () => {
      const mockAnchor = { click: mockClick, href: "", download: "" }
      vi.mocked(document.createElement).mockReturnValueOnce(mockAnchor as unknown as HTMLAnchorElement)
      vi.mocked($fetch).mockResolvedValueOnce(new ArrayBuffer(8))

      const { exportDocx } = useExport(bookId)
      await exportDocx("My Great Novel!")

      expect(mockAnchor.download).toBe("My-Great-Novel-.docx")
    })

    it("falls back to manuscript.docx when no title provided", async () => {
      const mockAnchor = { click: mockClick, href: "", download: "" }
      vi.mocked(document.createElement).mockReturnValueOnce(mockAnchor as unknown as HTMLAnchorElement)
      vi.mocked($fetch).mockResolvedValueOnce(new ArrayBuffer(8))

      const { exportDocx } = useExport(bookId)
      await exportDocx()

      expect(mockAnchor.download).toBe("manuscript.docx")
    })
  })

  describe("withExportGuard error handling", () => {
    it("sets isExporting back to false on error", async () => {
      vi.mocked($fetch).mockRejectedValueOnce(new Error("fail"))

      const { isExporting, exportMarkdown } = useExport(bookId)
      await exportMarkdown()

      expect(isExporting.value).toBe(false)
    })

    it("shows error toast with error message for Error instances", async () => {
      vi.mocked($fetch).mockRejectedValueOnce(new Error("Custom error message"))

      const { exportMarkdown } = useExport(bookId)
      await exportMarkdown()

      expect(mockToastAdd).toHaveBeenCalledWith({
        title: "Export Failed",
        description: "Custom error message",
        color: "error",
      })
    })

    it("shows generic message for non-Error exceptions", async () => {
      vi.mocked($fetch).mockRejectedValueOnce("string error")

      const { exportMarkdown } = useExport(bookId)
      await exportMarkdown()

      expect(mockToastAdd).toHaveBeenCalledWith({
        title: "Export Failed",
        description: "Could not export your manuscript. Please try again.",
        color: "error",
      })
    })

    it("resolves bookId from ref", async () => {
      const dynamicBookId = ref("dynamic-id")
      vi.mocked($fetch).mockResolvedValueOnce({ markdown: "x", filename: "f.md" })

      const { exportMarkdown } = useExport(dynamicBookId)
      await exportMarkdown()

      expect(vi.mocked($fetch)).toHaveBeenCalledWith("/api/export/markdown", {
        method: "POST",
        body: { bookId: "dynamic-id" },
      })
    })
  })
})
