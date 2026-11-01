import { describe, expect, it } from 'vitest'
import type { MatchReport, WorldState } from '../../src/domain'
import { optionsFor } from '../../src/engine/data/keyMomentOptions'
import { resolveOpponents } from '../../src/engine/matchOpponent'
import { startWeek } from '../../src/engine/turn'
import { PLAN, readyWorld } from '../fixtures/matchday'

function liveMatch(seed = 2026): { world: WorldState; report: MatchReport } {
  const result = startWeek(readyWorld(seed), PLAN)
  const report = result.world.lastMatch as MatchReport
  expect(report.status).toBe('live')
  return { world: result.world, report }
}

function recomputed(world: WorldState, report: MatchReport, withOpponents: boolean) {
  const opponents = withOpponents ? resolveOpponents(world, report) : null
  const isHome = report.homeId === world.clubId
  const player = world.players[world.playerId]
  if (!player) throw new Error('缺少用户球员')
  const map = new Map<string, number>()
  for (const moment of report.keyMoments ?? []) {
    for (const option of optionsFor(moment.kind, { player, isHome, opponents })) {
      map.set(`${moment.id}:${option.id}`, option.successChance)
    }
  }
  return map
}

function basesOf(report: MatchReport): string[] {
  const bases: string[] = []
  for (const moment of report.keyMoments ?? []) {
    for (const option of moment.options) bases.push(option.successBasisZh ?? '')
  }
  return bases
}

function loweredOptionKeys(withFoes: Map<string, number>, withoutFoes: Map<string, number>): string[] {
  const lowered: string[] = []
  for (const [key, chance] of withFoes) {
    if ((withoutFoes.get(key) ?? chance) > chance) lowered.push(key)
  }
  return lowered
}

describe('关键回合在开场时锁定对手', () => {
  it('存档里的每个选项概率都等于用同一对手重算的结果', () => {
    const { world, report } = liveMatch()
    const expected = recomputed(world, report, true)

    let compared = 0
    for (const moment of report.keyMoments ?? []) {
      for (const option of moment.options) {
        expect(option.successChance).toBe(expected.get(`${moment.id}:${option.id}`))
        compared += 1
      }
    }
    expect(compared).toBeGreaterThan(0)
  })

  it('至少一个选项因为对手存在而更难', () => {
    const { world, report } = liveMatch()
    const withFoes = recomputed(world, report, true)
    const withoutFoes = recomputed(world, report, false)

    for (const moment of report.keyMoments ?? []) {
      for (const option of moment.options) {
        expect(option.successChance).toBe(withFoes.get(`${moment.id}:${option.id}`))
        expect(withoutFoes.get(`${moment.id}:${option.id}`)).toBeGreaterThanOrEqual(
          option.successChance,
        )
      }
    }
    const lowered = loweredOptionKeys(withFoes, withoutFoes)
    expect(lowered.length).toBeGreaterThan(0)
  })

  it('直播选项的依据里能看到对面的门将、后卫或前锋', () => {
    const { report } = liveMatch()
    const mentionsFoe = basesOf(report).filter((basis) => basis.includes('对手'))

    expect(mentionsFoe.length).toBeGreaterThan(0)
    expect(mentionsFoe[0]).toMatch(/对手(门将|后卫|前锋)/)
  })
})
