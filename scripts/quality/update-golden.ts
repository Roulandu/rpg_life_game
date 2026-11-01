import { writeFileSync } from 'node:fs'
import type { WeeklyPlan } from '../../src/domain/types'
import { advanceWeek } from '../../src/engine/turn'
import { hashState } from '../../src/lib/rng'
import { ENGINE_VERSION, generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../../tests/fixtures/career'

const SEED = 42
const WEEKS = 38
const PLAN: WeeklyPlan = { training: 'technical', extra: 'none' }
const target = 'quality/golden/season-seed-42.json'

function replay() {
  let world = generateWorld(testOptions({ seed: SEED }), TEST_NOW)
  for (let week = 0; week < WEEKS; week += 1) {
    world = advanceWeek(world, PLAN).world
  }
  return hashState(world)
}

const hash = replay()
if (replay() !== hash) throw new Error('golden replay is not deterministic')

const fixture = {
  engineVersion: ENGINE_VERSION,
  seed: SEED,
  plan: PLAN,
  weeks: WEEKS,
  hash,
}

writeFileSync(target, `${JSON.stringify(fixture, null, 2)}\n`)
console.log(`${target} -> ${hash} (${ENGINE_VERSION})`)
