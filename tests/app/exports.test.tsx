import { describe, expect, it } from 'vitest'
import { App, ErrorBoundary, GameLayout } from '../../src/app'

describe('app public entry', () => {
  it('exports the composition root components', () => {
    expect(typeof App).toBe('function')
    expect(typeof GameLayout).toBe('function')
    expect(typeof ErrorBoundary).toBe('function')
  })
})
