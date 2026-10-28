import { describe, expect, it } from 'vitest'
import type { WeeklyPlan } from '../../src/domain/types'
import { advanceWeek } from '../../src/engine/turn'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

const PLAN: WeeklyPlan = { training: 'technical', extra: 'none' }

describe('engine strength wiring', () => {
  it('keeps club strength finite when a week is simulated through the domain helper', () => {
    const start = generateWorld(testOptions(), TEST_NOW)
    const { world } = advanceWeek(start, PLAN)

    expect(world.week).toBe(start.week + 1)
    for (const club of Object.values(world.clubs)) {
      for (const value of Object.values(club.strength)) {
        expect(Number.isFinite(value)).toBe(true)
        expect(value).toBeGreaterThanOrEqual(20)
        expect(value).toBeLessThanOrEqual(99)
      }
    }
  })
})
