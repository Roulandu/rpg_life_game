import { describe, expect, it } from 'vitest'
import type { WeeklyPlan } from '../../src/domain/types'
import { hashState } from '../../src/engine/rng'
import { advanceWeek } from '../../src/engine/turn'
import { ENGINE_VERSION, generateWorld } from '../../src/world/generator'
import golden from '../../quality/golden/season-seed-42.json'
import { TEST_NOW, testOptions } from '../fixtures/career'

describe('golden replay', () => {
  it('replays the seed-42 season to the recorded hash', () => {
    const plan = golden.plan as WeeklyPlan
    let world = generateWorld(testOptions({ seed: golden.seed }), TEST_NOW)
    for (let week = 0; week < golden.weeks; week += 1) {
      world = advanceWeek(world, plan).world
    }
    expect(hashState(world)).toBe(golden.hash)
  })

  it('keeps the golden fixture tied to the engine version', () => {
    expect(ENGINE_VERSION).toBe(golden.engineVersion)
  })
})
