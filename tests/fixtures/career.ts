import type { CareerCreateOptions } from '../../src/domain/types'

export const TEST_NOW = '2026-08-01T00:00:00.000Z'

export function testOptions(overrides: Partial<CareerCreateOptions> = {}): CareerCreateOptions {
  return {
    name: '测试球员',
    nationality: '中国',
    age: 17,
    position: 'CM',
    archetype: 'technician',
    background: 'academy',
    clubId: 'club:ENG:2:04',
    seed: 424242,
    ...overrides,
  }
}
