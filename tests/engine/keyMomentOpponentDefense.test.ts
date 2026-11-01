import { describe, expect, it } from 'vitest'
import {
  basisOf,
  chanceOf,
  contextFor,
  softAll,
  toughAll,
  toughShooterOnly,
} from '../fixtures/keyMomentRivals'
import { optionsFor } from '../../src/engine/data/keyMomentOptions'
import { KINDS } from '../fixtures/keyMomentKinds'

describe('防守与定位球关键回合读对手属性', () => {
  it('对手前锋射门越猛，扑救越难', () => {
    expect(chanceOf('save', toughShooterOnly, 'reflex')).toBeLessThan(chanceOf('save', softAll, 'reflex'))
    expect(basisOf('save', toughShooterOnly, 'reflex')).toContain('对手前锋')
  })

  it('点球面对强门将更吃亏', () => {
    for (const id of ['placed', 'panenka']) {
      expect(chanceOf('penalty', toughAll, id)).toBeLessThan(chanceOf('penalty', softAll, id))
    }
    expect(basisOf('penalty', toughAll, 'placed')).toContain('对手门将')
  })

  it('没有对手信息时所有选项仍给出合法概率与依据', () => {
    for (const kind of KINDS) {
      for (const option of optionsFor(kind, contextFor(null))) {
        expect(option.successChance).toBeGreaterThan(0)
        expect(option.successChance).toBeLessThan(1)
        expect((option.successBasisZh ?? '').length).toBeGreaterThan(0)
      }
    }
  })

  it('带上对手后仍然每类五个选项且概率不破界', () => {
    for (const kind of KINDS) {
      const options = optionsFor(kind, contextFor(toughAll))
      expect(options).toHaveLength(5)
      for (const option of options) {
        expect(option.successChance).toBeGreaterThan(0)
        expect(option.successChance).toBeLessThan(1)
      }
    }
  })
})
