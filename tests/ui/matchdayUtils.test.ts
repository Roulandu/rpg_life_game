import { describe, expect, it } from 'vitest'
import { EVENT_TONE, eventSideLabel } from '../../src/ui/screens/matchday/matchdayUtils'

describe('matchday utils', () => {
  it('为攻击、射门、扑救、角球、犯规与越位提供色调', () => {
    for (const type of ['attack', 'shot', 'save', 'corner', 'foul', 'offside']) {
      expect(EVENT_TONE[type]).toBeTruthy()
    }
  })

  it('把事件方映射为主客标签', () => {
    expect(eventSideLabel('home')).toBe('主')
    expect(eventSideLabel('away')).toBe('客')
    expect(eventSideLabel(undefined)).toBeNull()
  })
})
