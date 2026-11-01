import { describe, expect, it } from 'vitest'
import { computeOverall } from '../../src/domain'
import type { AttrAllocation, CareerCreateOptions } from '../../src/domain'
import { generateWorld } from '../../src/world/generator'
import { previewUserStart } from '../../src/world/userDraft'
import { TEST_NOW, testOptions } from '../fixtures/career'

function userOf(options: CareerCreateOptions) {
  const world = generateWorld(options, TEST_NOW)
  return world.players[world.playerId]
}

function previewOf(allocation: AttrAllocation, overrides = {}): ReturnType<typeof previewUserStart> {
  return previewUserStart(testOptions({ seed: 33557, allocation, ...overrides }))
}

describe('建号预览与真实存档同源', () => {
  it('不加点时预览的基准属性与潜力就是存档里的那一套', () => {
    const options = testOptions({ seed: 33557 })
    const preview = previewUserStart(options)
    const user = userOf(options)
    expect(preview.attributes).toEqual(user.attributes)
    expect(preview.baseAttributes).toEqual(preview.attributes)
    expect(preview.potential).toBe(user.potential)
    expect(preview.age).toBe(user.age)
  })

  it('合法点买后预览属性 === 存档属性', () => {
    const preview = previewOf({ shooting: 3, passing: 2, technique: 4 })
    const stored = userOf(testOptions({ seed: 33557, allocation: { shooting: 3, passing: 2, technique: 4 } }))
    expect(preview.ok).toBe(true)
    expect(preview.used).toBe(9)
    expect(preview.budget).toBe(10)
    expect(preview.attributes.shooting).toBe(preview.baseAttributes.shooting + 3)
    expect(preview.attributes).toEqual(stored.attributes)
  })

  it('超预算时预览给出 overBudget，属性退回基准且与存档一致', () => {
    const plain = previewUserStart(testOptions({ seed: 33557 }))
    const allocation = { shooting: 4, pace: 4, physical: 4, mental: 4 }
    const preview = previewOf(allocation)
    expect(preview.issues).toContain('overBudget')
    expect(preview.attributes).toEqual(plain.attributes)
    expect(preview.attributes).toEqual(userOf(testOptions({ seed: 33557, allocation })).attributes)
  })

  it('非门将点门将属性给出 goalkeepingGate，门将则没有这条', () => {
    expect(previewOf({ goalkeeping: 2 }).issues).toContain('goalkeepingGate')
    expect(previewOf({ goalkeeping: 2 }, { position: 'GK' }).issues).toEqual([])
  })

  it('预览给出的属性永远不越过潜力', () => {
    for (const allocation of [{}, { technique: 4 }, { shooting: 4, passing: 4, dribbling: 4, mental: 4 }]) {
      const preview = previewOf(allocation)
      expect(computeOverall(previewOf(allocation).position, preview.attributes)).toBeLessThanOrEqual(preview.potential)
    }
  })

  it('预算只由年龄与背景决定：16 岁 4 点、青训另加 3、21 岁青训 22 点', () => {
    expect(previewUserStart(testOptions({ age: 16, background: 'lowerLeague' })).budget).toBe(4)
    expect(previewUserStart(testOptions({ age: 16, background: 'academy' })).budget).toBe(7)
    expect(previewUserStart(testOptions({ age: 21, background: 'overseas' })).budget).toBe(19)
    expect(previewUserStart(testOptions({ age: 21, background: 'academy' })).budget).toBe(22)
  })

  it('同一种子重复预览得到同一结果，预览不消耗额外随机数', () => {
    const first = previewUserStart(testOptions({ seed: 7 }))
    expect(previewUserStart(testOptions({ seed: 7, allocation: {} }))).toEqual(first)
  })
})
