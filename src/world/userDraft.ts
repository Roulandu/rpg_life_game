import {
  archetypeBonus,
  backgroundBonus,
  checkAllocation,
  clamp,
  computeOverall,
  round1,
} from '../domain'
import type {
  AllocationIssue,
  AllocationResult,
  Attributes,
  CareerCreateOptions,
  Club,
  Contract,
  Position,
} from '../domain'
import { createRng, type Rng } from '../lib'
import { applyBonuses, makeAttributes } from './attributeFactory'
import { START_SEASON } from './constants'

export interface UserBaseDraft {
  rng: Rng
  age: number
  baseAbility: number
  attributes: Attributes
  potential: number
}

/**
 * 建号基准：主角的年龄、原始能力值、十项属性与潜力。
 * 这段随机数序列必须与球员工厂完全一致，所以预览与生成共用同一个函数，
 * 也把 `rng` 一起交回调用方，后续 `pickFoot` 才不会读错位。
 * `name` 刻意不进随机数材料：界面在输入姓名的过程中就实时重算这套数字，
 * 姓名参与抽签等于给玩家一个刷初始属性的入口。
 */
export function draftUserBase(options: CareerCreateOptions): UserBaseDraft {
  const rng = createRng(options.seed, 'user', options.age, options.position)
  const age = clamp(options.age, 16, 21)
  const baseAbility = 46 + (age - 16) * 2 + rng.normal(0, 2.5)
  const attributes = makeAttributes(options.position, baseAbility, rng)
  applyBonuses(attributes, options.position, [
    archetypeBonus(options.archetype),
    backgroundBonus(options.background),
  ])
  // 点买不消耗随机数：种子流位置与加点前完全一致，潜力仍由 baseAbility 决定。
  const potential = clamp(baseAbility + 24 + rng.int(0, 10) - (age - 16) * 2, 60, 92)
  return { rng, age, baseAbility, attributes, potential }
}

/** 把点买请求套到基准上：校验口径只有 `checkAllocation` 一处。 */
export function resolveUserAttributes(
  options: CareerCreateOptions,
  base: UserBaseDraft,
): AllocationResult {
  return checkAllocation({
    position: options.position,
    attributes: base.attributes,
    potential: round1(base.potential),
    age: base.age,
    background: options.background,
    allocation: options.allocation ?? {},
  })
}

export interface CareerPreview {
  age: number
  position: Position
  potential: number
  /** 点买之前的基准属性，界面用它显示「原始值」。 */
  baseAttributes: Attributes
  /** 真正会写进存档的那套属性：非法点买时等于基准。 */
  attributes: Attributes
  overall: number
  budget: number
  used: number
  issues: AllocationIssue[]
  ok: boolean
}

/**
 * 建号面板的预览入口。与 `makeUserPlayer` 走同一份 `draftUserBase` +
 * `resolveUserAttributes`，所以界面上读到的数字与签完合同后档案里的数字必然相同。
 */
export function previewUserStart(options: CareerCreateOptions): CareerPreview {
  const base = draftUserBase(options)
  const draft = resolveUserAttributes(options, base)
  const attributes = draft.ok ? draft.applied : base.attributes
  return {
    age: base.age,
    position: options.position,
    potential: round1(base.potential),
    baseAttributes: base.attributes,
    attributes,
    overall: computeOverall(options.position, attributes),
    budget: draft.budget,
    used: draft.used,
    issues: draft.issues,
    ok: draft.ok,
  }
}

/** 主角第一份合同：未成年多给一年长约，并附一次签字费。 */
export function makeUserContract(club: Club, wageWeekly: number, age: number): Contract {
  const years = age <= 18 ? 3 : 2
  return {
    clubId: club.id,
    wageWeekly,
    startSeason: START_SEASON,
    endSeason: START_SEASON + years,
    signingBonus: Math.round(wageWeekly * 4),
  }
}
