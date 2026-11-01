import { describe, expect, it } from 'vitest'
import {
  ARCHETYPE_LABELS,
  ATTR_KEYS,
  POSITION_GROUPS,
  POSITION_WEIGHTS,
  archetypeBonus,
  backgroundBonus,
  computeOverall,
  isGoalkeeper,
  positionGroup,
  roundAttr,
} from '../../src/domain'

function flatAttributes(value: number) {
  return Object.fromEntries(ATTR_KEYS.map((key) => [key, value])) as Record<(typeof ATTR_KEYS)[number], number>
}

describe('属性域口径', () => {
  it('每个位置的职业组与权重表都能取到，且权重和为 1', () => {
    for (const position of Object.keys(POSITION_WEIGHTS) as (keyof typeof POSITION_WEIGHTS)[]) {
      const weights = POSITION_WEIGHTS[position]
      const sum = ATTR_KEYS.reduce((total, key) => total + (weights[key] ?? 0), 0)
      expect(positionGroup(position)).toBe(POSITION_GROUPS[position])
      expect(sum).toBeCloseTo(1, 6)
    }
  })

  it('均匀属性下职业评分就等于该属性，权重缺失的属性按 0 计', () => {
    expect(computeOverall('ST', flatAttributes(70) as never)).toBeCloseTo(70, 6)
    const partial = { ...flatAttributes(60), goalkeeping: 90 } as never
    expect(computeOverall('CM', partial)).toBeLessThanOrEqual(60.1)
  })

  it('属性量化保留三位小数，日训练的小步成长不会被抹成 0', () => {
    expect(roundAttr(50.0336)).toBe(50.034)
    expect(roundAttr(50)).toBe(50)
    expect(roundAttr(0.0004)).toBe(0)
  })

  it('三种背景加成分别偏技术、偏身体、偏心理，且海外历练没有负项', () => {
    const academy = backgroundBonus('academy')
    const lowerLeague = backgroundBonus('lowerLeague')
    const overseas = backgroundBonus('overseas')
    expect(academy.technique).toBeGreaterThan(0)
    expect(academy.physical).toBeLessThan(0)
    expect(lowerLeague.physical).toBeGreaterThan(0)
    expect(lowerLeague.technique).toBeLessThan(0)
    expect(Object.values(overseas).every((delta) => delta > 0)).toBe(true)
    expect(academy).not.toEqual(lowerLeague)
  })

  it('五种原型加成各有方向，未知原型返回空对象', () => {
    expect(archetypeBonus('speedster').defending).toBeLessThan(0)
    expect(archetypeBonus('technician').technique).toBeGreaterThan(0)
    expect(archetypeBonus('engine').stamina).toBeGreaterThan(0)
    expect(archetypeBonus('finisher').shooting).toBeGreaterThan(0)
    expect(archetypeBonus('wall').physical).toBeGreaterThan(0)
    expect(archetypeBonus('unknown')).toEqual({})
    expect(isGoalkeeper('GK')).toBe(true)
    expect(isGoalkeeper('ST')).toBe(false)
    expect(Object.keys(ARCHETYPE_LABELS)).toHaveLength(5)
  })
})

