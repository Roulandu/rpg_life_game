import { describe, expect, it } from 'vitest'
import { anthropicAdapter } from '../../src/llm/providers/anthropic'
import { openAiAdapter } from '../../src/llm/providers/openai'
import { SUBMIT_WEEK_TOOL } from '../../src/llm/tools'
import { LlmError, type LlmConfig } from '../../src/llm/types'

const openAi: LlmConfig = {
  provider: 'openai',
  model: 'gpt-4.1-mini',
  temperature: 0.85,
  tokenParam: 'max_tokens',
}

const anthropic: LlmConfig = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-5',
  temperature: 0.7,
}

function toolInput(config: LlmConfig) {
  return {
    config,
    apiKey: 'test-key',
    system: 'system prompt',
    user: 'user prompt',
    tool: SUBMIT_WEEK_TOOL,
    maxTokens: 600,
  }
}

describe('OpenAI-compatible adapter', () => {
  it('builds a forced tool call with bearer auth', () => {
    const request = openAiAdapter.buildToolRequest(toolInput(openAi))
    const body = JSON.parse(request.body as string)

    expect(request.url).toBe('https://api.openai.com/v1/chat/completions')
    expect(request.headers?.Authorization).toBe('Bearer test-key')
    expect(body.model).toBe('gpt-4.1-mini')
    expect(body.messages).toHaveLength(2)
    expect(body.tools[0].function.name).toBe('submit_week')
    expect(body.tool_choice).toEqual({ type: 'function', function: { name: 'submit_week' } })
    expect(body.max_tokens).toBe(600)
    expect(body.max_completion_tokens).toBeUndefined()
  })

  it('normalizes custom base urls and token parameter', () => {
    const request = openAiAdapter.buildToolRequest(
      toolInput({
        ...openAi,
        baseUrl: 'https://proxy.example.com/v1/chat/completions/',
        tokenParam: 'max_completion_tokens',
      }),
    )
    const body = JSON.parse(request.body as string)
    expect(request.url).toBe('https://proxy.example.com/v1/chat/completions')
    expect(body.max_completion_tokens).toBe(600)
    expect(body.max_tokens).toBeUndefined()
  })

  it('parses tool_calls, legacy function_call and content JSON', () => {
    const call = openAiAdapter.parseToolResponse(
      JSON.stringify({
        model: 'gpt-4.1-mini',
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                { function: { name: 'submit_week', arguments: '{"headlineZh":"标题"}' } },
              ],
            },
          },
        ],
        usage: { prompt_tokens: 120, completion_tokens: 40 },
      }),
      'submit_week',
    )
    expect(call.input).toEqual({ headlineZh: '标题' })
    expect(call.usage).toEqual({ promptTokens: 120, completionTokens: 40 })
    expect(call.model).toBe('gpt-4.1-mini')

    const legacy = openAiAdapter.parseToolResponse(
      JSON.stringify({
        choices: [{ message: { function_call: { name: 'submit_week', arguments: '{"a":1}' } } }],
      }),
      'submit_week',
    )
    expect(legacy.input).toEqual({ a: 1 })

    const content = openAiAdapter.parseToolResponse(
      JSON.stringify({ choices: [{ message: { content: '```json\n{"b":2}\n```' } }] }),
      'submit_week',
    )
    expect(content.input).toEqual({ b: 2 })
  })

  it('rejects responses without a tool call', () => {
    expect(() =>
      openAiAdapter.parseToolResponse(JSON.stringify({ choices: [{ message: {} }] }), 'submit_week'),
    ).toThrow(LlmError)
    expect(() => openAiAdapter.parseToolResponse('not json', 'submit_week')).toThrow(LlmError)
  })
})

describe('Anthropic adapter', () => {
  it('builds a forced tool call with Anthropic headers', () => {
    const request = anthropicAdapter.buildToolRequest(toolInput(anthropic))
    const body = JSON.parse(request.body as string)

    expect(request.url).toBe('https://api.anthropic.com/v1/messages')
    expect(request.headers?.['x-api-key']).toBe('test-key')
    expect(request.headers?.['anthropic-version']).toBe('2023-06-01')
    expect(request.headers?.['anthropic-dangerous-direct-browser-access']).toBe('true')
    expect(body.system).toBe('system prompt')
    expect(body.tools[0].input_schema).toEqual(SUBMIT_WEEK_TOOL.parameters)
    expect(body.tool_choice).toEqual({ type: 'tool', name: 'submit_week' })
  })

  it('normalizes /v1 and /messages base urls', () => {
    const v1 = anthropicAdapter.buildToolRequest({
      ...toolInput({ ...anthropic, baseUrl: 'https://api.anthropic.com/v1/' }),
    })
    expect(v1.url).toBe('https://api.anthropic.com/v1/messages')

    const messages = anthropicAdapter.buildToolRequest({
      ...toolInput({ ...anthropic, baseUrl: 'https://proxy.example.com/messages' }),
    })
    expect(messages.url).toBe('https://proxy.example.com/messages')
  })

  it('parses tool_use blocks and token usage', () => {
    const result = anthropicAdapter.parseToolResponse(
      JSON.stringify({
        model: 'claude-sonnet-4-5',
        content: [
          { type: 'text', text: '旁白' },
          { type: 'tool_use', name: 'submit_week', input: { headlineZh: '标题' } },
        ],
        usage: { input_tokens: 200, output_tokens: 80 },
      }),
      'submit_week',
    )
    expect(result.input).toEqual({ headlineZh: '标题' })
    expect(result.text).toBe('旁白')
    expect(result.usage).toEqual({ promptTokens: 200, completionTokens: 80 })
  })

  it('rejects responses without a tool_use block', () => {
    expect(() =>
      anthropicAdapter.parseToolResponse(
        JSON.stringify({ content: [{ type: 'text', text: '没有工具' }] }),
        'submit_week',
      ),
    ).toThrow(LlmError)
  })
})
