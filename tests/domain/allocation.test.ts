import { describe, expect, it } from 'vitest'
import {
  ALLOCATION_ACADEMY_BONUS,
  ALLOCATION_BASE,
  ALLOCATION_MAX_PER_ATTR,
  ALLOCATION_PER_AGE_YEAR,
  applyAllocation,
  allocationBudget,
  allocationTotal,
  checkAllocation,
  computeOverall,
} from '../../src/domain'
import type { AllocationIssue, AttrAllocation, Attributes, CareerBackground, Position } from '../../src/domain'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

const world = generateWorld(testOptions({ seed: 11 }), TEST_NOW)
const created = world.players[world.playerId]!

interface Draft {
  position?: Position
  age?: number
  background?: CareerBackground
  allocation?: AttrAllocation
  potential?: number
}

/** 建号点买的输入尽量薄：属性、潜力、年龄、背景与待分配的点数。 */
function requestOf(draft: Draft) {
  const attributes = { ...created.attributes } as Attributes
  return {
    position: draft.position ?? created.position,
    attributes,
    potential: draft.potential ?? created.potential,
    age: draft.age ?? 18,
    background: draft.background ?? 'academy',
    allocation: draft.allocation ?? {},
  }
}

function issuesOf(draft: Draft): AllocationIssue[] {
  return checkAllocation(requestOf(draft)).issues
}

describe('建号属性点预算', () => {
  it('预算随年龄增长，青训背景另加 3 点', () => {
    expect(allocationBudget(16, 'lowerLeague')).toBe(ALLOCATION_BASE)
    expect(allocationBudget(16, 'academy')).toBe(ALLOCATION_BASE + ALLOCATION_ACADEMY_BONUS)
    expect(allocationBudget(20, 'overseas')).toBe(ALLOCATION_BASE + ALLOCATION_PER_AGE_YEAR * 4)
    expect(allocationBudget(20, 'academy')).toBe(ALLOCATION_BASE + ALLOCATION_PER_AGE_YEAR * 4 + ALLOCATION_ACADEMY_BONUS)
  })

  it('分配总数按各项求和', () => {
    expect(allocationTotal({})).toBe(0)
    expect(allocationTotal({ shooting: 2, pace: 3 })).toBe(5)
  })

  it('回归: 超出预算与超出单属性上限都要报，且不吞掉另一条', () => {
    // 18 岁青训的预算是 4 + 3×2 + 3 = 13 点：14 点超预算但每项合规，5 点不超预算但单项超限。
    const overBudget = issuesOf({ allocation: { shooting: 4, pace: 4, physical: 4, mental: 2 } })
    const overPerAttr = issuesOf({ allocation: { shooting: ALLOCATION_MAX_PER_ATTR + 1 } })

    expect(overBudget).toContain('overBudget')
    expect(overPerAttr).toContain('overPerAttr')
    expect(overPerAttr).not.toContain('overBudget')
  })

  it('负数与非整数点数是非法输入', () => {
    expect(issuesOf({ allocation: { shooting: -1 } })).toContain('invalidPoints')
    expect(issuesOf({ allocation: { shooting: 1.5 } })).toContain('invalidPoints')
  })

  it('非门将不能把点投到门将属性上', () => {
    const gk = requestOf({ position: 'ST', allocation: { goalkeeping: 2 } })
    const keeper = requestOf({ position: 'GK', allocation: { goalkeeping: 2 } })

    expect(checkAllocation(gk).issues).toContain('goalkeepingGate')
    expect(checkAllocation(keeper).ok).toBe(true)
  })

  it('分配后的综合分不得越过潜力', () => {
    const fresh = requestOf({ allocation: {} })
    const tight = requestOf({ allocation: {}, potential: computeOverall(fresh.position, fresh.attributes) })
    const overPotential = { ...tight, allocation: { shooting: 1 } as AttrAllocation }

    expect(checkAllocation(tight).ok).toBe(true)
    expect(checkAllocation(overPotential).issues).toContain('overPotential')
  })

  it('合法分配产出新属性，原属性对象不被改写', () => {
    const draft = requestOf({ allocation: { shooting: 2, pace: 1 } })
    const before = { ...draft.attributes }

    const result = checkAllocation(draft)

    expect(result.ok).toBe(true)
    expect(result.applied.shooting).toBe(before.shooting + 2)
    expect(result.applied.pace).toBe(before.pace + 1)
    expect(draft.attributes).toEqual(before)
    expect(applyAllocation(before, { mental: 3 })).toEqual({ ...before, mental: before.mental + 3 })
  })
})
