import { describe, expect, it } from 'vitest'
import type { KeyMoment, KeyMomentKind, MatchReport } from '../../src/domain/types'
import { optionsFor } from '../../src/engine/data/keyMomentOptions'
import { buildMediaReaction, outcomeText } from '../../src/engine/keyMomentNarrative'
import { KINDS, strongPlayer } from '../fixtures/keyMomentKinds'

const player = strongPlayer()

function momentFor(kind: KeyMomentKind): KeyMoment {
  return {
    id: `km:${kind}`,
    minute: 30,
    kind,
    titleZh: kind,
    promptZh: kind,
    options: optionsFor(kind, { player, isHome: true }),
    defaultOptionId: 'default',
    roll: 0.5,
  }
}

describe('key moment narrative', () => {
  it('12 类成功与失败叙事都非空', () => {
    for (const kind of KINDS) {
      const moment = momentFor(kind)
      for (const option of moment.options) {
        expect(outcomeText(moment, option, true, '测试球员').length).toBeGreaterThan(0)
        expect(outcomeText(moment, option, false, '测试球员').length).toBeGreaterThan(0)
      }
    }
  })
})

function reportFor(overrides: Partial<MatchReport>): MatchReport {
  return {
    homeId: 'club:home',
    awayId: 'club:away',
    homeName: '主队',
    awayName: '客队',
    homeGoals: 1,
    awayGoals: 0,
    userPlayed: true,
    userRating: 6.8,
    goals: [],
    events: [],
    ...overrides,
  } as MatchReport
}

function reaction(report: MatchReport): string {
  return buildMediaReaction(report, '林远', 0, 0, true)
}

describe('buildMediaReaction 未出场', () => {
  it('没有出场时不评价关键回合处理，只说明未出场与球队结果', () => {
    const text = reaction(reportFor({ userPlayed: false, userRating: null }))
    expect(text).toContain('未出场')
    expect(text).not.toContain('关键回合')
    expect(text).not.toContain('犹豫')
  })

  it('出场但评分低仍会被质疑', () => {
    const text = reaction(reportFor({ userPlayed: true, userRating: 5.6 }))
    expect(text).toContain('关键回合')
  })
})
