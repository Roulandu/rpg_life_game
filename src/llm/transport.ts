import {
  HttpError,
  selectHttp,
  type HttpMode,
  type HttpPort,
  type HttpRequest,
  type HttpResponse,
} from '../platform/http'
import { LlmError, type NetworkMode } from './types'

export type { HttpRequest, HttpResponse }

export interface LlmTransport {
  readonly kind: 'browser' | 'native'
  send(request: HttpRequest): Promise<HttpResponse>
}

function toLlmError(error: HttpError): LlmError {
  return new LlmError(error.kind, error.message, { retryable: error.retryable })
}

function toHttpMode(mode: NetworkMode): HttpMode {
  if (mode === 'native') return 'native'
  if (mode === 'auto') return 'auto'
  return 'browser'
}

export function createTransport(mode: NetworkMode = 'auto'): LlmTransport {
  let port: HttpPort
  try {
    port = selectHttp(toHttpMode(mode))
  } catch (error) {
    if (error instanceof HttpError) throw toLlmError(error)
    throw error
  }

  return {
    kind: port.kind,
    async send(request) {
      try {
        return await port.send(request)
      } catch (error) {
        if (error instanceof HttpError) throw toLlmError(error)
        throw error
      }
    },
  }
}
