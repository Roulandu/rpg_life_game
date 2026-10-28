import { CapacitorHttp } from '@capacitor/core'
import { isNativePlatform } from './native'

export interface HttpRequest {
  url: string
  headers: Record<string, string>
  body: string
  timeoutMs?: number
}

export interface HttpResponse {
  status: number
  bodyText: string
}

export type HttpErrorKind = 'timeout' | 'network' | 'config'
export type HttpMode = 'auto' | 'browser' | 'native'

export class HttpError extends Error {
  readonly kind: HttpErrorKind
  readonly retryable: boolean

  constructor(kind: HttpErrorKind, message: string, retryable = false) {
    super(message)
    this.name = 'HttpError'
    this.kind = kind
    this.retryable = retryable
  }
}

export interface HttpPort {
  readonly kind: 'browser' | 'native'
  send(request: HttpRequest): Promise<HttpResponse>
}

const DEFAULT_TIMEOUT_MS = 45_000

export const browserHttp: HttpPort = {
  kind: 'browser',
  async send({ url, headers, body, timeoutMs = DEFAULT_TIMEOUT_MS }) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      })
      return { status: response.status, bodyText: await response.text() }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new HttpError('timeout', `请求超过 ${Math.round(timeoutMs / 1000)} 秒`, true)
      }
      throw new HttpError('network', '网络请求失败', true)
    } finally {
      clearTimeout(timer)
    }
  },
}

export const nativeHttp: HttpPort = {
  kind: 'native',
  async send({ url, headers, body, timeoutMs = DEFAULT_TIMEOUT_MS }) {
    let data: unknown
    try {
      data = JSON.parse(body)
    } catch {
      throw new HttpError('config', '请求体不是有效 JSON。')
    }

    try {
      const response = await CapacitorHttp.post({
        url,
        headers,
        data,
        connectTimeout: 15_000,
        readTimeout: timeoutMs,
        responseType: 'json',
      })
      const bodyText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
      return { status: response.status, bodyText }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (/timeout|timed out/i.test(message)) {
        throw new HttpError('timeout', message, true)
      }
      throw new HttpError('network', message, true)
    }
  },
}

export function selectHttp(mode: HttpMode = 'auto'): HttpPort {
  const native = isNativePlatform()
  if (mode === 'native' && !native) {
    throw new HttpError('config', '原生 HTTP 模式只能在 Android 应用中使用。')
  }
  if (mode === 'native' || (mode === 'auto' && native)) return nativeHttp
  return browserHttp
}
