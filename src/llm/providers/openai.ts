import type { HttpRequest } from '../transport'
import { LlmError, type LlmConfig, type StructuredResult } from '../types'
import {
  clampTemperature,
  numberOrZero,
  parseJsonObject,
  type ProviderAdapter,
  type ToolRequestInput,
} from './common'

interface OpenAiMessage {
  content?: string | null
  tool_calls?: { function?: { name?: string; arguments?: string } }[]
  function_call?: { name?: string; arguments?: string }
}

function endpoint(config: LlmConfig): string {
  let base = (config.baseUrl?.trim() || 'https://api.openai.com/v1').replace(/\/+$/, '')
  if (base.endsWith('/chat/completions')) base = base.slice(0, -'/chat/completions'.length)
  return `${base}/chat/completions`
}

function headers(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  }
}

function tokenField(config: LlmConfig, maxTokens: number): Record<string, number> {
  return { [config.tokenParam === 'max_completion_tokens' ? 'max_completion_tokens' : 'max_tokens']: maxTokens }
}

export const openAiAdapter: ProviderAdapter = {
  buildToolRequest({ config, apiKey, system, user, tool, maxTokens }: ToolRequestInput): HttpRequest {
    return {
      url: endpoint(config),
      headers: headers(apiKey),
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters,
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: tool.name } },
        temperature: clampTemperature(config.temperature, 2),
        ...tokenField(config, maxTokens),
      }),
    }
  },

  parseToolResponse(bodyText: string, toolName: string): StructuredResult {
    let data: {
      model?: string
      choices?: { message?: OpenAiMessage }[]
      usage?: { prompt_tokens?: number; completion_tokens?: number }
    }
    try {
      data = JSON.parse(bodyText)
    } catch {
      throw new LlmError('invalid', '供应商返回了非 JSON 响应')
    }

    const message = data.choices?.[0]?.message
    let rawArguments: string | undefined

    const call = message?.tool_calls?.find((item) => item.function?.name === toolName)
    if (call?.function?.arguments) {
      rawArguments = call.function.arguments
    } else if (message?.function_call?.name === toolName) {
      rawArguments = message.function_call.arguments
    } else if (typeof message?.content === 'string') {
      rawArguments = message.content
    }

    if (!rawArguments) throw new LlmError('invalid', '响应里没有 submit 工具调用')

    const input =
      typeof rawArguments === 'string' ? parseJsonObject(rawArguments) : (rawArguments as unknown)
    if (!input || typeof input !== 'object') {
      throw new LlmError('invalid', '工具调用参数不是有效 JSON 对象')
    }

    return {
      input,
      text: typeof message?.content === 'string' ? message.content : '',
      usage: {
        promptTokens: numberOrZero(data.usage?.prompt_tokens),
        completionTokens: numberOrZero(data.usage?.completion_tokens),
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
        messages: [{ role: 'user', content: 'ping' }],
        temperature: 0,
        ...tokenField(config, 1),
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
