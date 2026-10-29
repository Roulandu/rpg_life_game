import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  actionLabelFor,
  describeLlmError,
  pickDefaultBaseUrl,
  pickDefaultModel,
  resolveChatAction,
  sanitizeText,
  testLlmConnection,
} from '../../src/llm'
import type { LlmProvider } from '../../src/llm'

describe('llm public entry', () => {
  it('exports provider defaults and chat helpers', () => {
    expect(typeof pickDefaultModel('openai')).toBe('string')
    expect(typeof pickDefaultBaseUrl('openai')).toBe('string')
    expect(typeof actionLabelFor('extra_training')).toBe('string')
    expect(typeof describeLlmError).toBe('function')
    expect(typeof resolveChatAction).toBe('function')
    expect(typeof testLlmConnection).toBe('function')
  })

  it('exports text sanitizing', () => {
    expect(sanitizeText('  hello\u0000  ', 100)).toBe('hello')
  })

  it('exposes provider type', () => {
    expectTypeOf<LlmProvider>().not.toBeAny()
  })
})
