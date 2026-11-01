import { describe, expect, it } from 'vitest'
import {
  STYLE_ATTRS,
  STYLE_LABELS,
  STYLE_TRAINING_BONUS,
  styleAdvice,
  styleFit,
  styleFitLabel,
  styleSynergy,
  styleTopAttrs,
} from '../../src/domain'
import type { AttrKey, Attributes, ClubStyle, Player } from '../../src/domain'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

const STYLES: ClubStyle[] = ['possession', 'counter', 'highPress', 'direct']
const world = generateWorld(testOptions({ seed: 2026 }), TEST_NOW)

function squadPlayer(index = 1): Player {
  const club = world.clubs[world.clubId]
  return structuredClone(world.players[club.squadIds[index]])
}

function withAttributes(player: Player, values: Partial<Attributes>): Player {
  for (const key of Object.keys(player.attributes) as AttrKey[]) {
    player.attributes[key] = values[key] ?? 55
  }
  return player
}

describe('教练风格契合度', () => {
  it('四种风格都有中文标签与训练偏好，且偏好在训练重点枚举内', () => {
    for (const style of STYLES) {
      expect(STYLE_LABELS[style]).toBeTruthy()
      expect(['physical', 'technical', 'tactical', 'recovery']).toContain(STYLE_TRAINING_BONUS[style])
    }
  })

  it('契合度落在 0 到 1 之间，同一输入两次结果一致', () => {
    const player = squadPlayer()
    for (const style of STYLES) {
      const fit = styleFit(player, style)
      expect(fit).toBeGreaterThanOrEqual(0)
      expect(fit).toBeLessThanOrEqual(1)
      expect(styleFit(player, style)).toBe(fit)
    }
  })

  it('组织型中场更契合控球推进，冲击型前锋更契合长传冲吊', () => {
    const creator = withAttributes(squadPlayer(), {
      passing: 88,
      technique: 86,
      dribbling: 82,
      mental: 80,
      defending: 40,
      physical: 45,
      pace: 50,
      shooting: 45,
      stamina: 70,
      goalkeeping: 12,
    })
    const targetman = withAttributes(squadPlayer(), {
      physical: 88,
      pace: 84,
      shooting: 82,
      mental: 70,
      stamina: 76,
      defending: 55,
      passing: 45,
      technique: 50,
      dribbling: 52,
      goalkeeping: 12,
    })

    expect(styleFit(creator, 'possession')).toBeGreaterThan(styleFit(creator, 'direct'))
    expect(styleFit(targetman, 'direct')).toBeGreaterThan(styleFit(targetman, 'possession'))
  })

  it('契合度分档给玩家看得懂的中文判定', () => {
    expect(styleFitLabel(0.8)).toBe('风格契合')
    expect(styleFitLabel(0.55)).toBe('风格中性')
    expect(styleFitLabel(0.3)).toBe('风格不合')
  })

  it('训练重点命中教练偏好才有加成', () => {
    expect(styleSynergy('technical', 'possession')).toBeCloseTo(1.12)
    expect(styleSynergy('physical', 'possession')).toBe(1)
  })
})

describe('打法文案与看重属性', () => {
  it('三档契合度各有一句人话，都点明教练打法', () => {
    const matched = styleAdvice('possession', 0.8)
    const neutral = styleAdvice('counter', 0.55)
    const cold = styleAdvice('direct', 0.3)

    expect(matched).toContain(STYLE_LABELS.possession)
    expect(neutral).toContain(STYLE_LABELS.counter)
    expect(cold).toContain(STYLE_LABELS.direct)
    expect(matched).toMatch(/契合/)
    expect(neutral).toMatch(/中性/)
    expect(cold).toMatch(/首发/)
    expect(new Set([matched, neutral, cold]).size).toBe(3)
  })

  it('每种打法都能列出最看重的属性，数量按参数收敛', () => {
    for (const style of STYLES) {
      const top = styleTopAttrs(style)
      expect(top).toHaveLength(2)
      expect(styleTopAttrs(style, 3)).toHaveLength(3)
      // 列出的必须是该打法权重表里的键，且按权重降序。
      const weights = STYLE_ATTRS[style]
      const descending = top.map((key) => weights[key] ?? 0)
      expect([...descending].sort((a, b) => b - a)).toEqual(descending)
    }
    expect(styleTopAttrs('possession')[0]).toBe('passing')
    expect(styleTopAttrs('direct')[0]).toBe('physical')
  })
})
