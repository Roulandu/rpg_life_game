import { describe, expect, it } from 'vitest'
import type { AttrKey, Player } from '../../src/domain'
import {
  scoreChance,
  type OpponentPair,
  type ScoreChanceInput,
} from '../../src/engine/data/scoreChance'
import { strongPlayer } from '../fixtures/keyMomentKinds'

function withAttr(key: AttrKey, value: number): Player {
  const player = strongPlayer()
  return { ...player, attributes: { ...player.attributes, [key]: value } }
}

function pairWith(keeper: Player | null, marker?: Player | null, shooter?: Player | null): OpponentPair {
  return { keeper, marker: marker ?? null, shooter: shooter ?? null }
}

/** 直接射门：我的射门与心理加分，对面门将的门将技术减分。 */
const shootFormula: ScoreChanceInput = {
  base: 0.3,
  actor: { shooting: 0.004, mental: 0.0008 },
  opponent: { keeper: { goalkeeping: 0.0012 } },
  low: 0.2,
  high: 0.8,
}

describe('关键回合的成功率公式', () => {
  it('面对强门将的射门更不容易成功，扣分按门将属性算', () => {
    const weak = scoreChance(strongPlayer(), shootFormula, pairWith(withAttr('goalkeeping', 40)))
    const elite = scoreChance(strongPlayer(), shootFormula, pairWith(withAttr('goalkeeping', 92)))

    expect(weak.successChance).toBe(0.694)
    expect(elite.successChance).toBe(0.631)
  })

  it('依据文本同时报出我的属性与对手属性，并写明各自的百分比', () => {
    const result = scoreChance(strongPlayer(), shootFormula, pairWith(withAttr('goalkeeping', 92)))

    expect(result.successBasisZh).toContain('射门 92 +36.8%')
    expect(result.successBasisZh).toContain('对手门将 92 -11%')
  })

  it('没有对手信息时退回只看自己的算法', () => {
    const alone = scoreChance(strongPlayer(), shootFormula, null)

    expect(alone.successChance).toBe(0.742)
    expect(alone.successBasisZh).not.toContain('对手')
  })

  it('声明了对手角色但阵上没人时跳过该项，不产生 NaN', () => {
    const result = scoreChance(strongPlayer(), shootFormula, pairWith(null))

    expect(Number.isFinite(result.successChance)).toBe(true)
    expect(result.successBasisZh).not.toContain('对手')
  })

  it('常量选项不吃属性也不吃对手，依据用自带的一句话', () => {
    const formula: ScoreChanceInput = {
      base: 0.92,
      low: 0.92,
      high: 0.92,
      flatBasisZh: '稳定的护球选择',
    }

    const result = scoreChance(strongPlayer(), formula, pairWith(withAttr('goalkeeping', 92)))

    expect(result.successChance).toBe(0.92)
    expect(result.successBasisZh).toBe('稳定的护球选择')
  })

  it('概率始终夹在上下界之间，属性再高也顶不破天花板', () => {
    const formula: ScoreChanceInput = {
      base: 0.9,
      opponent: { marker: { defending: 0.02 } },
      low: 0.3,
      high: 0.6,
    }

    const top = scoreChance(strongPlayer(), formula, pairWith(null, withAttr('defending', 0)))
    const bottom = scoreChance(strongPlayer(), formula, pairWith(null, withAttr('defending', 92)))

    expect(top.successChance).toBe(0.6)
    expect(bottom.successChance).toBe(0.3)
  })

  it('绝技加成叠进概率并写进依据', () => {
    const formula: ScoreChanceInput = {
      base: 0.3,
      actor: { dribbling: 0.004 },
      opponent: { marker: { defending: 0.001 } },
      terms: [{ text: '彩虹过人 Ⅲ +7.3%', delta: 0.073 }],
      low: 0.2,
      high: 0.8,
    }

    const result = scoreChance(strongPlayer(), formula, pairWith(null, withAttr('defending', 70)))

    expect(result.successBasisZh).toContain('彩虹过人 Ⅲ +7.3%')
    expect(result.successBasisZh).toContain('对手后卫 防守 70 -7%')
    expect(result.successChance).toBe(0.671)
  })
})
