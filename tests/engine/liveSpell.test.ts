import { describe, expect, it } from 'vitest'
import { computeClubStrength } from '../../src/domain'
import type { MatchLiveState } from '../../src/domain'
import {
  buildSpell,
  goalState,
  homePossessionShare,
  kickoffState,
  momentState,
  type SpellInput,
} from '../../src/engine/liveSpell'
import { pitchWorld } from '../fixtures/pitchWorld'

const { world, homeClub, awayClub, lineups } = pitchWorld()
const homeStrength = computeClubStrength(homeClub, world.players)
const awayStrength = computeClubStrength(awayClub, world.players)

const base: Omit<SpellInput, 'minute' | 'previous'> = {
  seed: world.seed,
  fixtureId: 'fixture:test:spell',
  homeStrength,
  awayStrength,
  homeXg: 1.4,
  awayXg: 1.1,
  lineups,
}

function runSpells(count = 90): ReturnType<typeof buildSpell>[] {
  let previous: MatchLiveState = kickoffState('home')
  const results: ReturnType<typeof buildSpell>[] = []
  for (let minute = 1; minute <= count; minute += 1) {
    const result = buildSpell({ ...base, minute, previous })
    results.push(result)
    previous = result.liveState
  }
  return results
}

describe('live spell continuity', () => {
  it('控球连续，平均每段 spell 在 2.5 到 5 分钟之间', () => {
    const spells = runSpells()
    const changes = spells.filter(
      (spell, index) => index > 0 && spell.possession !== spells[index - 1]!.possession,
    ).length
    const average = spells.length / (changes + 1)

    expect(average).toBeGreaterThanOrEqual(2.5)
    expect(average).toBeLessThanOrEqual(5)
  })

  it('同侧控球时球位整体朝对方球门推进，单步不超过 0.2', () => {
    const spells = runSpells()
    let forwardTotal = 0
    let forwardCount = 0
    for (let index = 1; index < spells.length; index += 1) {
      const current = spells[index]!
      const previous = spells[index - 1]!
      if (current.possession !== previous.possession) continue
      if (previous.liveState.pendingKickoff) continue
      forwardTotal += current.ballX - previous.ballX
      forwardCount += 1
      if (current.goalSide) continue
      let cursor = previous.ballX
      for (const step of current.steps) {
        expect(Math.abs(step.ballX - cursor)).toBeLessThanOrEqual(0.2)
        cursor = step.ballX
      }
    }

    expect(forwardTotal / forwardCount).toBeGreaterThan(0.01)
  })

  it('丢球时先记录就地转换，球位不瞬移', () => {
    const spells = runSpells()
    const turnover = spells.findIndex(
      (spell, index) =>
        index > 0 &&
        spell.possession !== spells[index - 1]!.possession &&
        spell.liveState.pendingKickoff === undefined,
    )

    expect(turnover).toBeGreaterThan(0)
    const current = spells[turnover]!
    const previous = spells[turnover - 1]!
    expect(current.steps[0]?.kind).toBe('turnover')
    expect(Math.abs(current.steps[0]!.ballX - previous.ballX)).toBeLessThanOrEqual(0.02)
  })
})

describe('live spell tracks', () => {
  it('每分钟生成 1 到 3 段轨迹，终点等于控球人脚下的球位', () => {
    for (const spell of runSpells(30)) {
      expect(spell.steps.length).toBeGreaterThanOrEqual(1)
      expect(spell.steps.length).toBeLessThanOrEqual(3)
      const last = spell.steps.at(-1)!
      expect(last.ballX).toBeCloseTo(spell.ballX, 5)
      expect(last.side).toBe(spell.possession)
      expect(spell.carrierId).toBeTruthy()
      expect(last.carrierId).toBe(spell.carrierId)
      const squad = lineups[spell.possession].map((player) => player.id)
      expect(squad).toContain(spell.carrierId)
    }
  })

  it('相同输入返回完全相同的结果', () => {
    const first = buildSpell({ ...base, minute: 17, previous: kickoffState('home') })
    const second = buildSpell({ ...base, minute: 17, previous: kickoffState('home') })
    expect(second).toEqual(first)
  })
})

describe('live spell states', () => {
  it('开球、关键时刻与进球状态球位正确', () => {
    expect(kickoffState('away')).toEqual({ possession: 'away', ballX: 0.5 })
    expect(momentState('home').ballX).toBeGreaterThan(0.7)
    expect(momentState('away').ballX).toBeLessThan(0.3)
    expect(goalState('home')).toEqual({
      possession: 'home',
      ballX: 0.96,
      pendingKickoff: 'away',
    })
    expect(goalState('away').pendingKickoff).toBe('home')
  })

  it('控球份额偏向中场更强的一方且落在 0.3 到 0.7', () => {
    expect(homePossessionShare(homeStrength, awayStrength)).toBeGreaterThanOrEqual(0.3)
    expect(homePossessionShare(homeStrength, awayStrength)).toBeLessThanOrEqual(0.7)
    expect(homePossessionShare({ ...homeStrength, midfield: 90 }, { ...awayStrength, midfield: 40 })).toBeGreaterThan(0.5)
  })
})
