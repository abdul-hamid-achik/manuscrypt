import Anthropic from "@anthropic-ai/sdk"
import type { H3Event } from "h3"
import { executeTool } from "./ai-tool-executor"

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
      console.error("[AI Stream Error]", error instanceof Error ? error.message : error)
      await eventStream.push(
        JSON.stringify({
          type: "error",
          content: "An error occurred while generating the response. Please try again.",
        }),
      )
    } finally {
      await eventStream.close()
    }
  }

  run()
  return eventStream.send()
}

export function streamAgenticResponse(
  event: H3Event,
  anthropic: Anthropic,
  opts: {
    model: string
    maxTokens: number
    system: string
    messages: Array<{ role: "user" | "assistant"; content: string | Anthropic.Messages.ContentBlockParam[] }>
    tools: Anthropic.Messages.Tool[]
    maxToolRounds?: number
    bookId: string
  },
) {
  const eventStream = createEventStream(event)
  const maxRounds = opts.maxToolRounds ?? 5

  const run = async () => {
    try {
      // Build mutable messages array for the agentic loop
      const messages: Anthropic.Messages.MessageParam[] = opts.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      let usedWriteTools = false

      for (let round = 0; round < maxRounds; round++) {
        const stream = anthropic.messages.stream({
          model: opts.model,
          max_tokens: opts.maxTokens,
          system: opts.system,
          messages,
          tools: opts.tools,
        })

        // Collect the full response for tool use detection
        const _contentBlocks: Anthropic.Messages.ContentBlock[] = []
        let _stopReason: string | null = null

        for await (const evt of stream) {
          if (evt.type === "content_block_delta" && evt.delta.type === "text_delta") {
            await eventStream.push(
              JSON.stringify({ type: "text", content: evt.delta.text }),
            )
          }
          if (evt.type === "content_block_stop") {
            // Get the accumulated message from stream
          }
          if (evt.type === "message_delta") {
            _stopReason = evt.delta.stop_reason ?? null
          }
        }

        // Get the final message to check for tool use
        const finalMessage = await stream.finalMessage()
        const toolUseBlocks = finalMessage.content.filter(
          (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
        )

        if (toolUseBlocks.length === 0 || finalMessage.stop_reason !== "tool_use") {
          // No tool use — we're done
          break
        }

        // Execute each tool and collect results
        const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []
        for (const toolBlock of toolUseBlocks) {
          await eventStream.push(
            JSON.stringify({ type: "tool_start", tool: toolBlock.name }),
          )

          const result = await executeTool(
            toolBlock.name,
            toolBlock.input as Record<string, unknown>,
            opts.bookId,
          )

          if (result.wroteData) usedWriteTools = true

          await eventStream.push(
            JSON.stringify({
              type: "tool_result",
              tool: toolBlock.name,
              success: !result.is_error,
            }),
          )

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolBlock.id,
            content: result.content,
            is_error: result.is_error,
          })
        }

        // Add assistant message (with tool use) and tool results for next round
        messages.push({ role: "assistant", content: finalMessage.content })
        messages.push({ role: "user", content: toolResults })
      }

      await eventStream.push(
        JSON.stringify({ type: "done", usedWriteTools }),
      )
    } catch (error) {
      console.error("[AI Agentic Stream Error]", error instanceof Error ? error.message : error)
      await eventStream.push(
        JSON.stringify({
          type: "error",
          content: "An error occurred while generating the response. Please try again.",
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
    if (!textBlock?.text) {
      throw createError({ statusCode: 502, message: `${opts.errorLabel ?? "AI"} returned an empty response` })
    }
    return JSON.parse(textBlock.text)
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw createError({ statusCode: 500, message: `Failed to parse ${opts.errorLabel ?? "AI"} response` })
    }
    console.error(`[AI ${opts.errorLabel ?? "request"} Error]`, error instanceof Error ? error.message : error)
    throw createError({
      statusCode: 500,
      message: `${opts.errorLabel ?? "AI request"} failed. Please try again.`,
    })
  }
}
