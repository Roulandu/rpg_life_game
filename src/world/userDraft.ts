import { checkAllocation, round1 } from '../domain'
import type { Attributes, CareerCreateOptions, Club, Contract } from '../domain'
import { START_SEASON } from './constants'

/**
 * 建号点买：把创建生涯时传来的加点落到属性上。
 * 非法点买整份作废，存档里绝不留下「半套加点」；整段不消耗随机数，所以种子流的位置保持不变。
 * 校验口径只有 `checkAllocation` 一处，UI 预检与生成终检走同一个函数。
 */
export function draftUserAttributes(
  options: CareerCreateOptions,
  attributes: Attributes,
  age: number,
  potential: number,
): Attributes {
  const draft = checkAllocation({
    position: options.position,
    attributes,
    potential: round1(potential),
    age,
    background: options.background,
    allocation: options.allocation ?? {},
  })
  return draft.ok ? draft.applied : attributes
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
