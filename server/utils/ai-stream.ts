import Anthropic from "@anthropic-ai/sdk"
import type { H3Event, EventStream } from "h3"

export function createAnthropicClient(): Anthropic {
  const config = useRuntimeConfig()
  if (!config.anthropicApiKey) {
    throw createError({ statusCode: 500, message: "ANTHROPIC_API_KEY not configured" })
  }
  return new Anthropic({ apiKey: config.anthropicApiKey })
}

export function streamAnthropicResponse(
  event: H3Event,
  anthropic: Anthropic,
  opts: {
    model: string
    maxTokens: number
    system: string
    messages: Array<{ role: "user" | "assistant"; content: string }>
  },
) {
  const eventStream = createEventStream(event)

  const run = async () => {
    try {
      const stream = anthropic.messages.stream({
        model: opts.model,
        max_tokens: opts.maxTokens,
        system: opts.system,
        messages: opts.messages,
      })

      for await (const evt of stream) {
        if (
          evt.type === "content_block_delta" &&
          evt.delta.type === "text_delta"
        ) {
          await eventStream.push(
            JSON.stringify({ type: "text", content: evt.delta.text }),
          )
        }
      }

      await eventStream.push(JSON.stringify({ type: "done" }))
    } catch (error) {
      await eventStream.push(
        JSON.stringify({
          type: "error",
          content: error instanceof Error ? error.message : "Stream failed",
        }),
      )
    } finally {
      await eventStream.close()
    }
  }

  run()
  return eventStream.send()
}

export async function callAnthropicJson<T>(
  anthropic: Anthropic,
  opts: {
    model: string
    maxTokens: number
    system: string
    messages: Array<{ role: "user" | "assistant"; content: string }>
    errorLabel?: string
  },
): Promise<T> {
  try {
    const response = await anthropic.messages.create({
      model: opts.model,
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: opts.messages,
    })

    const textBlock = response.content.find((b) => b.type === "text")
    return JSON.parse(textBlock?.text ?? "{}")
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw createError({ statusCode: 500, message: `Failed to parse ${opts.errorLabel ?? "AI"} response` })
    }
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : `${opts.errorLabel ?? "AI request"} failed`,
    })
  }
}
