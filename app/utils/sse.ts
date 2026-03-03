export interface SseEvent {
  type: string
  content?: string
  tool?: string
  success?: boolean
  usedWriteTools?: boolean
  [key: string]: unknown
}

export function parseSseLines(chunk: string): SseEvent[] {
  const results: SseEvent[] = []
  const lines = chunk.split("\n")
  for (const line of lines) {
    const trimmed = line.startsWith("data: ") ? line.slice(6) : line.trim()
    if (!trimmed) continue
    try {
      results.push(JSON.parse(trimmed))
    } catch {
      // Skip malformed lines
    }
  }
  return results
}

export async function readSseStream(
  response: ReadableStream,
  onData: (data: SseEvent) => void,
): Promise<void> {
  const reader = response.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    for (const data of parseSseLines(chunk)) {
      onData(data)
    }
  }
}
