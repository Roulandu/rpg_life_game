import { describe, expect, it } from 'vitest'
import {
  KIND_PROMPTS,
  KIND_TITLES,
  KIND_TRIGGERS,
  optionsFor,
  type KindContext,
} from '../../src/engine/data/keyMomentOptions'
import { KINDS, strongPlayer } from '../fixtures/keyMomentKinds'

const player = strongPlayer()
const context: KindContext = { player, isHome: true }

describe('key moment options', () => {
  it('12 类都有标题、提示、触发条件与恰好 5 个选项', () => {
    for (const kind of KINDS) {
      expect(KIND_TITLES[kind].length).toBeGreaterThan(0)
      expect(KIND_PROMPTS[kind].length).toBeGreaterThan(0)
      expect(KIND_TRIGGERS[kind].length).toBeGreaterThan(0)
      expect(KIND_TRIGGERS[kind].startsWith('触发条件')).toBe(false)
      const options = optionsFor(kind, context)
      expect(options).toHaveLength(5)
      expect(new Set(options.map((option) => option.id)).size).toBe(5)
    }
  })

  it('每个选项都给出成功率依据与合法概率', () => {
    for (const kind of KINDS) {
      for (const option of optionsFor(kind, context)) {
        expect(option.successBasisZh?.length ?? 0).toBeGreaterThan(0)
        expect(option.successChance).toBeGreaterThan(0)
        expect(option.successChance).toBeLessThan(1)
      }
    }
  })

  it('新增类型能产生进球、助攻或防守收益', () => {
    const scoring = ['freeKick', 'headerDuel', 'oneOnOne', 'counterAttack', 'cross', 'longShot'] as const
    for (const kind of scoring) {
      const options = optionsFor(kind, context)
      expect(options.some((option) => option.goalOnSuccess || option.assistOnSuccess)).toBe(true)
    }
    for (const kind of ['headerDuel', 'duel', 'save'] as const) {
      const options = optionsFor(kind, context)
      expect(options.some((option) => (option.coachOnSuccess ?? 0) > 0)).toBe(true)
    }
  })
})
