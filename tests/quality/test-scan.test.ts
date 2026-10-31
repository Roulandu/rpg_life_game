import { describe, expect, it } from 'vitest'
import { countTests, hasAddedTestCases, isTestSourceFile } from '../../scripts/quality/lib/test-scan'

describe('test source scanning', () => {
  it('counts it() and test() calls', () => {
    expect(countTests("it('a', () => {})\ntest('b', () => {})")).toBe(2)
  })

  it('recognises ts test sources under tests/', () => {
    expect(isTestSourceFile('tests/engine/match.test.ts')).toBe(true)
    expect(isTestSourceFile('src/app/GameLayout.tsx')).toBe(false)
  })

  it('recognises tsx test sources under tests/', () => {
    expect(isTestSourceFile('tests/ui/layout.test.tsx')).toBe(true)
  })

  it('accepts a new tsx test file as added coverage', () => {
    expect(
      hasAddedTestCases([
        { file: 'tests/ui/layout.test.tsx', before: null, after: "it('renders', () => {})" },
      ]),
    ).toBe(true)
  })

  it('rejects implementation-only changes', () => {
    expect(hasAddedTestCases([{ file: 'src/app/GameLayout.tsx', before: null, after: '' }])).toBe(
      false,
    )
  })

  it('rejects a shrunken tsx test file', () => {
    expect(
      hasAddedTestCases([
        {
          file: 'tests/ui/layout.test.tsx',
          before: "it('a', () => {})\nit('b', () => {})",
          after: "it('a', () => {})",
        },
      ]),
    ).toBe(false)
  })
})
