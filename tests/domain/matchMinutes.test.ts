import { describe, expect, it } from 'vitest'
import type { MatchReport } from '../../src/domain'
import { onPitchAt, userEntryMinuteOf } from '../../src/domain/matchMinutes'

function report(overrides: Partial<Pick<MatchReport, 'userPlayed' | 'userStarted' | 'userMinutes'>>) {
  return { userPlayed: true, userStarted: false, userMinutes: 25, ...overrides }
}

describe('登场分钟是单一真相源', () => {
  it('首发从 0 分钟、替补从 90 减出场分钟、未出场视为整场不在场上', () => {
    expect(userEntryMinuteOf(report({ userStarted: true, userMinutes: 90 }))).toBe(0)
    expect(userEntryMinuteOf(report({ userStarted: false, userMinutes: 25 }))).toBe(65)
    expect(userEntryMinuteOf(report({ userStarted: false, userMinutes: 90 }))).toBe(0)
    expect(userEntryMinuteOf(report({ userPlayed: false, userStarted: false, userMinutes: 0 }))).toBe(90)
  })

  it('主角在登场分钟之前不在场上，非主角不受闸门影响', () => {
    const user = { isUser: true }
    const teammate = { isUser: false }
    expect(onPitchAt(user, 65, 64)).toBe(false)
    expect(onPitchAt(user, 65, 65)).toBe(true)
    expect(onPitchAt(user, 65, 90)).toBe(true)
    expect(onPitchAt(teammate, 65, 1)).toBe(true)
    expect(onPitchAt(teammate, 90, 1)).toBe(true)
  })
})
