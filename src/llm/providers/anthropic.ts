import type { HttpRequest } from '../transport'
import { LlmError, type LlmConfig, type StructuredResult } from '../types'
import {
  clampTemperature,
  numberOrZero,
  type ProviderAdapter,
  type ToolRequestInput,
} from './common'

interface AnthropicBlock {
  type?: string
  name?: string
  input?: unknown
  text?: string
}

function endpoint(config: LlmConfig): string {
  let base = (config.baseUrl?.trim() || 'https://api.anthropic.com').replace(/\/+$/, '')
  if (base.endsWith('/messages')) return base
  if (base.endsWith('/v1')) return `${base}/messages`
  return `${base}/v1/messages`
}

function headers(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  }
}

export const anthropicAdapter: ProviderAdapter = {
  buildToolRequest({ config, apiKey, system, user, tool, maxTokens }: ToolRequestInput): HttpRequest {
    return {
      url: endpoint(config),
      headers: headers(apiKey),
      body: JSON.stringify({
        model: config.model,
        max_tokens: maxTokens,
        temperature: clampTemperature(config.temperature, 1),
        system,
        messages: [{ role: 'user', content: user }],
        tools: [
          {
            name: tool.name,
            description: tool.description,
            input_schema: tool.parameters,
          },
        ],
        tool_choice: { type: 'tool', name: tool.name },
      }),
    }
  },

  parseToolResponse(bodyText: string, toolName: string): StructuredResult {
    let data: {
      model?: string
      content?: AnthropicBlock[]
      usage?: { input_tokens?: number; output_tokens?: number }
    }
    try {
      data = JSON.parse(bodyText)
    } catch {
      throw new LlmError('invalid', '供应商返回了非 JSON 响应')
    }

    const blocks = Array.isArray(data.content) ? data.content : []
    const toolBlock = blocks.find((block) => block.type === 'tool_use' && block.name === toolName)
    if (!toolBlock?.input || typeof toolBlock.input !== 'object') {
      throw new LlmError('invalid', '响应里没有 submit 工具调用')
    }

    const text = blocks
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text)
      .join('\n')

    return {
      input: toolBlock.input,
      text,
      usage: {
        promptTokens: numberOrZero(data.usage?.input_tokens),
        completionTokens: numberOrZero(data.usage?.output_tokens),
      },
      model: data.model ?? null,
    }
  },

  buildTestRequest(config: LlmConfig, apiKey: string): HttpRequest {
    return {
      url: endpoint(config),
      headers: headers(apiKey),
      body: JSON.stringify({
        model: config.model,
        max_tokens: 1,
        temperature: 0,
        messages: [{ role: 'user', content: 'ping' }],
      }),
      timeoutMs: 20_000,
    }
  },

  parseTestResponse(bodyText: string): { model: string | null } {
    try {
      const data = JSON.parse(bodyText) as { model?: string }
      return { model: data.model ?? null }
    } catch {
      return { model: null }
    }
  },
}
