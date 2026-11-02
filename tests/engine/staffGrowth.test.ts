import { describe, expect, it } from 'vitest'
import { ATTR_KEYS } from '../../src/domain'
import type { Player } from '../../src/domain'
import { grantExp, investAttribute } from '../../src/engine/growth'
import { applyDailyTraining } from '../../src/engine/training'
import { applySpecialization } from '../../src/engine/specialization'
import { optionsFor } from '../../src/engine/data/keyMomentOptions'
import { freshWorld, keyAttrOf, tune, userOf } from '../fixtures/growth'
import { member, staffed } from '../fixtures/staff'

/** 关键回合的用例要一个属性可控的球员，别被生成时的随机属性带偏。 */
function flatPlayer(seed = 2026): Player {
  const user = userOf(freshWorld(seed))
  for (const key of ATTR_KEYS) user.attributes[key] = 80
  return user
}

function optionOf(player: Player, id: string, psychBonus?: number) {
  const option = optionsFor('bigChance', { player, isHome: true, psychBonus }).find((item) => item.id === id)
  if (!option) throw new Error(`bigChance 选项表里缺 ${id}`)
  return option
}

describe('私教让练出来的东西更值钱', () => {
  it('一次技术训练没有私教给 2 点经验，有了私教给 3 点', () => {
    const plain = staffed([])
    const withTrainer = staffed([member('trainer', 90)])
    const before = userOf(plain).exp
    const beforeTrained = userOf(withTrainer).exp

    applyDailyTraining(plain, 'technical')
    applyDailyTraining(withTrainer, 'technical')

    expect(userOf(plain).exp - before).toBe(2)
    expect(userOf(withTrainer).exp - beforeTrained).toBe(3)
  })

  it('比赛与事件给的经验不打折也不加成：私教只管「练」这条链路', () => {
    const withTrainer = staffed([member('trainer', 90)])
    const before = userOf(withTrainer).exp

    grantExp(withTrainer, 10, 'match')
    grantExp(withTrainer, 10, 'event')

    expect(userOf(withTrainer).exp - before).toBe(20)
  })

  it('属性投资在私教手下打九折：6 点经验变成 5 点', () => {
    const plainWorld = staffed([])
    tune(plainWorld, { exp: 100 })
    const keyAttr = keyAttrOf(userOf(plainWorld))

    const trainerWorld = staffed([member('trainer', 90)])
    tune(trainerWorld, { exp: 100 })

    const withoutTrainer = investAttribute(plainWorld, keyAttr, 1)
    const withTrainer = investAttribute(trainerWorld, keyAttr, 1)

    expect(withoutTrainer.ok).toBe(true)
    expect(withoutTrainer.cost).toBe(6)
    expect(withTrainer.cost).toBe(5)
  })

  it('特训课的进度从 1 点提到 1.5 点', () => {
    const world = staffed([member('trainer', 90)])
    const user = userOf(world)
    user.position = 'CM'
    for (const key of ATTR_KEYS) user.attributes[key] = 80
    user.moves = [{ moveId: 'mv_rainbow', level: 1, progress: 0 }]
    world.weekPlan.specialization = 'mv_rainbow'

    applySpecialization(world)

    expect(user.moves?.[0].progress).toBeCloseTo(1.5, 6)
  })
})

describe('关键回合读心理咨询师的心态疏导', () => {
  it('高风险选项吃到 +1.2%，低风险与常量选项不参与', () => {
    const player = flatPlayer()
    const gain = (id: string) => optionOf(player, id, 0.012).successChance - optionOf(player, id).successChance

    expect(gain('shoot')).toBeCloseTo(0.012, 6)
    expect(gain('chip')).toBeCloseTo(0.012, 6)
    expect(gain('square')).toBe(0)
    expect(gain('hold')).toBe(0)
  })

  it('疏导那一条写进依据文本，玩家看得见是谁在帮忙', () => {
    const player = flatPlayer()
    expect(optionOf(player, 'shoot', 0.012).successBasisZh).toContain('心态疏导 +1.2%')
    expect(optionOf(player, 'shoot').successBasisZh).not.toContain('心态疏导')
  })
})
