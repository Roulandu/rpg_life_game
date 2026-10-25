export type LlmProvider = 'openai' | 'anthropic' | 'custom'
export type NetworkMode = 'auto' | 'direct' | 'native' | 'proxy'

export interface LlmConfig {
  provider: LlmProvider
  model: string
  baseUrl?: string
  networkMode?: NetworkMode
  tokenParam?: 'max_tokens' | 'max_completion_tokens'
  temperature?: number
}

export interface LlmUsage {
  promptTokens: number
  completionTokens: number
}

export interface StructuredResult {
  input: unknown
  text: string
  usage: LlmUsage
  model: string | null
}

export type LlmErrorKind =
  | 'config'
  | 'auth'
  | 'rate'
  | 'server'
  | 'network'
  | 'timeout'
  | 'invalid'
  | 'cancelled'

export class LlmError extends Error {
  readonly kind: LlmErrorKind
  readonly status?: number
  readonly retryable: boolean

  constructor(kind: LlmErrorKind, message: string, options?: { status?: number; retryable?: boolean }) {
    super(message)
    this.name = 'LlmError'
    this.kind = kind
    this.status = options?.status
    this.retryable = options?.retryable ?? false
  }
}

export function describeLlmError(error: unknown): string {
  if (!(error instanceof LlmError)) {
    return error instanceof Error ? error.message : '发生了未知的 AI 错误。'
  }
  switch (error.kind) {
    case 'config':
      return error.message
    case 'auth':
      return 'API Key 无效，或这个 Key 没有调用该模型的权限。'
    case 'rate':
      return '请求过于频繁或额度已用尽，请稍后再试。'
    case 'server':
      return '模型供应商暂时不可用，请稍后重试。'
    case 'timeout':
      return 'AI 请求超时（45 秒）。可以稍后重试，或先使用本地模板继续。'
    case 'network':
      return '无法连接模型供应商。浏览器直连可能被 CORS 拦截，可改用自建代理或 Android 原生模式。'
    case 'invalid':
      return 'AI 返回的内容无法通过校验，已保留本地模板结果。'
    case 'cancelled':
      return 'AI 请求已取消。'
  }
}

export function pickDefaultBaseUrl(provider: LlmProvider): string {
  if (provider === 'anthropic') return 'https://api.anthropic.com'
  return 'https://api.openai.com/v1'
}

export function pickDefaultModel(provider: LlmProvider): string {
  return provider === 'anthropic' ? 'claude-sonnet-4-5' : 'gpt-4.1-mini'
}
