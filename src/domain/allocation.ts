import { ATTR_KEYS, computeOverall } from './attributes'
import { canInvestAttribute } from './growth'
import type { AttrKey, Attributes, CareerBackground, Position } from './types'

/** 建号点买预算：`(age − 16) × 3 + 4`，青训背景另加 3。 */
export const ALLOCATION_BASE = 4
export const ALLOCATION_PER_AGE_YEAR = 3
export const ALLOCATION_ACADEMY_BONUS = 3

/** 单项属性最多加 4 点，逼玩家做取舍而不是把某一项点满。 */
export const ALLOCATION_MAX_PER_ATTR = 4

export type AttrAllocation = Partial<Record<AttrKey, number>>

export type AllocationIssue = 'overBudget' | 'overPerAttr' | 'overPotential' | 'goalkeepingGate' | 'invalidPoints'

export interface AllocationRequest {
  position: Position
  attributes: Attributes
  potential: number
  age: number
  background: CareerBackground
  allocation: AttrAllocation
}

export interface AllocationResult {
  ok: boolean
  issues: AllocationIssue[]
  budget: number
  used: number
  applied: Attributes
}

export function allocationBudget(age: number, background: CareerBackground): number {
  const years = Math.max(0, Math.trunc(age) - 16)
  return (
    ALLOCATION_BASE +
    years * ALLOCATION_PER_AGE_YEAR +
    (background === 'academy' ? ALLOCATION_ACADEMY_BONUS : 0)
  )
}

export function allocationTotal(allocation: AttrAllocation): number {
  let total = 0
  for (const key of ATTR_KEYS) total += allocation[key] ?? 0
  return total
}

/** 纯函数：返回加过点的新属性对象，不改动入参。 */
export function applyAllocation(attributes: Attributes, allocation: AttrAllocation): Attributes {
  const applied = { ...attributes }
  for (const key of ATTR_KEYS) {
    const bonus = allocation[key] ?? 0
    if (bonus > 0) applied[key] = applied[key] + bonus
  }
  return applied
}

function issuesOf(request: AllocationRequest, used: number, applied: Attributes): AllocationIssue[] {
  const issues: AllocationIssue[] = []
  const invalid = ATTR_KEYS.some((key) => {
    const value = request.allocation[key] ?? 0
    return !Number.isInteger(value) || value < 0
  })
  if (invalid) issues.push('invalidPoints')
  if (ATTR_KEYS.some((key) => (request.allocation[key] ?? 0) > ALLOCATION_MAX_PER_ATTR)) issues.push('overPerAttr')
  if (used > allocationBudget(request.age, request.background)) issues.push('overBudget')
  if (!canInvestAttribute('goalkeeping', request.position) && (request.allocation.goalkeeping ?? 0) > 0) {
    issues.push('goalkeepingGate')
  }
  if (computeOverall(request.position, applied) > request.potential) issues.push('overPotential')
  return issues
}

/** 校验一次建号点买：任何一条不成立就 `ok = false`，但 `applied` 始终给出预览结果。 */
export function checkAllocation(request: AllocationRequest): AllocationResult {
  const used = allocationTotal(request.allocation)
  const applied = applyAllocation(request.attributes, request.allocation)
  const issues = issuesOf(request, used, applied)
  return { ok: issues.length === 0, issues, budget: allocationBudget(request.age, request.background), used, applied }
}
