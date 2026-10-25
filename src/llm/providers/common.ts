import type { HttpRequest } from '../transport'
import type { LlmConfig, StructuredResult } from '../types'

export interface ToolSpec {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface ToolRequestInput {
  config: LlmConfig
  apiKey: string
  system: string
  user: string
  tool: ToolSpec
  maxTokens: number
}

export interface ProviderAdapter {
  buildToolRequest(input: ToolRequestInput): HttpRequest
  parseToolResponse(bodyText: string, toolName: string): StructuredResult
  buildTestRequest(config: LlmConfig, apiKey: string): HttpRequest
  parseTestResponse(bodyText: string): { model: string | null }
}

export function clampTemperature(value: number | undefined, max: number): number {
  if (!Number.isFinite(value)) return Math.min(0.85, max)
  return Math.max(0, Math.min(max, value as number))
}

export function parseJsonObject(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1))
      } catch {
        return undefined
      }
    }
    return undefined
  }
}

export function numberOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}
