import { anthropicAdapter } from './providers/anthropic'
import type { ProviderAdapter, ToolSpec } from './providers/common'
import { openAiAdapter } from './providers/openai'
import { createTransport, type HttpResponse, type LlmTransport } from './transport'
import {
  LlmError,
  describeLlmError,
  type LlmConfig,
  type LlmErrorKind,
  type StructuredResult,
} from './types'

const RETRY_DELAYS_MS = [500, 1_400]

function adapterFor(config: LlmConfig): ProviderAdapter {
  return config.provider === 'anthropic' ? anthropicAdapter : openAiAdapter
}

function assertConfig(config: LlmConfig, apiKey: string): void {
  if (!apiKey.trim()) throw new LlmError('config', '请先在设置里填写 API Key。')
  if (!config.model.trim()) throw new LlmError('config', '请先在设置里填写模型名称。')
}

function detailFromBody(bodyText: string): string {
  try {
    const data = JSON.parse(bodyText) as {
      error?: { message?: string } | string
      message?: string
    }
    if (typeof data.error === 'string') return data.error
    if (data.error?.message) return data.error.message
    if (data.message) return data.message
  } catch {
    // 非 JSON 响应直接用截断文本。
  }
  return bodyText.slice(0, 240)
}

function errorKindForStatus(status: number): LlmErrorKind {
  if (status === 401 || status === 403) return 'auth'
  if (status === 429) return 'rate'
  if (status === 404) return 'config'
  if (status >= 500) return 'server'
  return 'invalid'
}

function errorFromResponse(response: HttpResponse): LlmError {
  const kind = errorKindForStatus(response.status)
  const detail = detailFromBody(response.bodyText)
  const prefix =
    kind === 'auth'
      ? '鉴权失败'
      : kind === 'rate'
        ? '请求受限'
        : kind === 'config'
          ? '接口地址或模型不存在'
          : kind === 'server'
            ? '供应商错误'
            : '请求无效'
  return new LlmError(kind, `${prefix}（HTTP ${response.status}）：${detail}`, {
    status: response.status,
    retryable: kind === 'rate' || kind === 'server' || response.status === 408,
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function sendWithRetry(transport: LlmTransport, request: Parameters<LlmTransport['send']>[0]): Promise<HttpResponse> {
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await transport.send(request)
      if (response.status >= 200 && response.status < 300) return response
      const error = errorFromResponse(response)
      if (!error.retryable || attempt === 2) throw error
      lastError = error
    } catch (error) {
      if (!(error instanceof LlmError)) throw error
      if (!error.retryable || attempt === 2) throw error
      lastError = error
    }
    await sleep(RETRY_DELAYS_MS[attempt] ?? 1_400)
  }
  throw lastError instanceof LlmError ? lastError : new LlmError('network', '请求失败')
}

export interface CallToolOptions {
  config: LlmConfig
  apiKey: string
  system: string
  user: string
  tool: ToolSpec
  maxTokens: number
}

export async function callStructuredTool(options: CallToolOptions): Promise<StructuredResult> {
  assertConfig(options.config, options.apiKey)
  const adapter = adapterFor(options.config)
  const transport = createTransport(options.config.networkMode ?? 'auto')
  const request = adapter.buildToolRequest(options)
  const response = await sendWithRetry(transport, request)
  return adapter.parseToolResponse(response.bodyText, options.tool.name)
}

export interface ConnectionTestResult {
  ok: boolean
  message: string
  latencyMs: number
  model: string | null
}

export async function testLlmConnection(config: LlmConfig, apiKey: string): Promise<ConnectionTestResult> {
  const started = Date.now()
  try {
    assertConfig(config, apiKey)
    const adapter = adapterFor(config)
    const transport = createTransport(config.networkMode ?? 'auto')
    const response = await sendWithRetry(transport, adapter.buildTestRequest(config, apiKey))
    const parsed = adapter.parseTestResponse(response.bodyText)
    const via = transport.kind === 'native' ? 'Android 原生 HTTP' : '浏览器直连'
    return {
      ok: true,
      message: `连接成功（${via}，${Date.now() - started} ms）${parsed.model ? ` · ${parsed.model}` : ''}`,
      latencyMs: Date.now() - started,
      model: parsed.model,
    }
  } catch (error) {
    return {
      ok: false,
      message: describeLlmError(error),
      latencyMs: Date.now() - started,
      model: null,
    }
  }
}
