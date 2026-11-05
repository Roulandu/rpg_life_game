import { describe, expect, it } from 'vitest'
import { RARITY_CHANCE_BUDGET, RARITY_ORDER, allMoves } from '../../src/domain'
import type { KeyMomentKind, MoveRarity } from '../../src/domain'
import {
  balancePlayer,
  chanceOf,
  eliteFoes,
  isConstantOption,
  kindsSeenByGroup,
  optionsOf,
  replaySeason,
  setAttributes,
} from '../fixtures/movesBalanceReplay'

/**
 * 设计带：整季关键回合的平均成功率要留在「多数能成、少数翻车」的区间。
 * 太低会让比赛像抛硬币，太高会让绝技与养成失去意义，所以这两条带子是内容门禁。
 */
const OFFERED_BAND: [number, number] = [0.5, 0.7]
const CHOSEN_BAND: [number, number] = [0.72, 0.92]
/** 满仓库绝技最多只能把整季平均抬高这么多，否则就是全部顶到天花板。 */
const MOVE_BOOST_MAX = 0.1
const HARD_CEILING = 0.92

const FOES = eliteFoes()
const BARE = balancePlayer()
const KINDS_BY_GROUP: Record<string, Set<KeyMomentKind>> = {
  GK: kindsSeenByGroup('GK'),
  DEF: kindsSeenByGroup('DEF'),
  MID: kindsSeenByGroup('MID'),
  FWD: kindsSeenByGroup('FWD'),
}

/**
 * 平衡带要按「整季真首发的球员」来统计：坐在替补席的种子一季只有十几个关键回合，
 * 均值、占比与覆盖率都没有分辨力。这两个种子都跑满 38 场首发。
 */
const BALANCE_SEED = 21
const OTHER_BALANCE_SEED = 58

const bareSeason = replaySeason(BALANCE_SEED, 0)
const loadedSeason = replaySeason(BALANCE_SEED, 3)
const otherSeedSeason = replaySeason(OTHER_BALANCE_SEED, 3)

interface Gain {
  rarity: MoveRarity
  key: string
  gain: number
  chance: number
  constant: boolean
}

function targetParts(target: string): [KeyMomentKind, string] {
  const [kind, optionId] = target.split(':')
  return [kind as KeyMomentKind, optionId ?? '']
}

/** 绝技的实战边际收益：同一个选项，挂满级与不挂之间的差，对手一律按最硬的算。 */
const GAINS: Gain[] = allMoves().flatMap((move) =>
  move.targets.map((target) => {
    const [kind, optionId] = targetParts(target)
    const before = chanceOf(BARE, FOES, kind, optionId) ?? 0
    const after = chanceOf(balancePlayer(3, move.id), FOES, kind, optionId) ?? 0
    return {
      rarity: move.rarity,
      key: `${move.id} -> ${target}`,
      gain: Math.round((after - before) * 1000) / 1000,
      chance: after,
      constant: isConstantOption(BARE, FOES, kind, optionId),
    }
  }),
)

function meanOf(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / (values.length || 1)
}

function meanGainOf(rarity: MoveRarity): number {
  return meanOf(GAINS.filter((gain) => gain.rarity === rarity).map((gain) => gain.gain))
}

/** 绝技声明的位置组里，是否一个目标选项都触发不了：卖出去就用不了的假位置。 */
function unusableGroups(): string[] {
  const list: string[] = []
  for (const move of allMoves()) {
    for (const group of move.positions) {
      const reachable = move.targets.some((target) => KINDS_BY_GROUP[group].has(targetParts(target)[0]))
      if (!reachable) list.push(`${move.id}@${group}`)
    }
  }
  return list
}

/** 目标选项 id 在对应的关键回合表里根本找不到：写错一个字母就永远不生效。 */
function deadTargets(): string[] {
  const list: string[] = []
  for (const move of allMoves()) {
    for (const target of move.targets) {
      const [kind, optionId] = targetParts(target)
      if (chanceOf(BARE, FOES, kind, optionId) === null) list.push(`${move.id} -> ${target}`)
    }
  }
  return list
}

/** 属性 92 + 满级绝技的最理想情况，仍然不许顶破硬上限。 */
function bestCaseChance(): number {
  let best = 0
  for (const gain of GAINS) {
    const [moveId, target] = gain.key.split(' -> ')
    const [kind, optionId] = targetParts(target ?? '')
    const loaded = setAttributes(balancePlayer(3, moveId ?? ''), 92)
    best = Math.max(best, chanceOf(loaded, FOES, kind, optionId) ?? gain.chance)
  }
  return best
}

/** 某个稀有度满级加成的平均值：这是数据设计口径，与实战净收益互为对照。 */
function nominalMeanOf(rarity: MoveRarity): number {
  const deltas: number[] = []
  for (const move of allMoves()) {
    if (move.rarity === rarity) deltas.push(move.levels[2].chanceDelta)
  }
  return meanOf(deltas)
}

describe('整季关键回合成功率带', () => {
  it('跑满一季：上桌选项的平均成功率落在设计带内，裸装与满仓库都不越界', () => {
    expect(bareSeason.moments).toBeGreaterThanOrEqual(30)
    expect(bareSeason.avgOffered).toBeGreaterThanOrEqual(OFFERED_BAND[0])
    expect(bareSeason.avgOffered).toBeLessThanOrEqual(OFFERED_BAND[1])
    expect(loadedSeason.avgOffered).toBeGreaterThanOrEqual(OFFERED_BAND[0])
    expect(loadedSeason.avgOffered).toBeLessThanOrEqual(OFFERED_BAND[1])
  })

  it('自动推进挑的最稳一路，平均也只到 72%–92%，不会整季无脑成功', () => {
    for (const season of [bareSeason, loadedSeason]) {
      expect(season.avgChosen).toBeGreaterThanOrEqual(CHOSEN_BAND[0])
      expect(season.avgChosen).toBeLessThanOrEqual(CHOSEN_BAND[1])
    }
  })

  it('满仓库绝技只把整季平均抬高 2%–10%，不会把所有选项顶到天花板', () => {
    const boost = loadedSeason.avgOffered - bareSeason.avgOffered
    expect(boost).toBeGreaterThan(0.01)
    expect(boost).toBeLessThanOrEqual(MOVE_BOOST_MAX)
  })

  it('两个种子的整季平均相差不到 6%，平衡不是靠某个种子蒙对', () => {
    expect(Math.abs(loadedSeason.avgOffered - otherSeedSeason.avgOffered)).toBeLessThanOrEqual(0.06)
    expect(Math.abs(loadedSeason.avgChosen - otherSeedSeason.avgChosen)).toBeLessThanOrEqual(0.06)
  })

  it('回归: 一季的实际成功率与冻结概率对得上，结算没有第二套算法', () => {
    for (const season of [bareSeason, loadedSeason, otherSeedSeason]) {
      expect(Math.abs(season.winRate - season.avgChosen)).toBeLessThanOrEqual(0.12)
    }
  })

  it('一季里没有任何选项变成必然成功或必然失败', () => {
    for (const season of [bareSeason, loadedSeason]) {
      expect(season.offeredMax).toBeLessThan(0.95)
      expect(season.offeredMin).toBeGreaterThan(0.05)
    }
  })

  it('最常被自动选走的那个选项占比不到四分之一，保守答案不会吃掉整季', () => {
    expect(loadedSeason.topDefaultShare).toBeLessThanOrEqual(0.25)
  })

  it('一季里每类关键回合都把整张选项表端上桌，没有永不露面的选项', () => {
    expect(loadedSeason.kinds.length).toBeGreaterThanOrEqual(6)
    for (const kind of loadedSeason.kinds) {
      const table = optionsOf(BARE, FOES, kind as KeyMomentKind)
        .map((option) => option.id)
        .sort()
      expect(loadedSeason.optionIdsByKind[kind]).toEqual(table)
      expect(table.length).toBeGreaterThanOrEqual(4)
    }
  })
})

describe('绝技位置与选项不退化', () => {
  it('回归: 绝技声明的每个位置组都至少有一个目标选项真能在那个位置触发', () => {
    expect(unusableGroups()).toEqual([])
  })

  it('绝技目标都指得到真实选项，没有写错选项 id 的死数据', () => {
    expect(deadTargets()).toEqual([])
  })
})

describe('稀有度的实战边际收益', () => {
  it('对抗拉满后，传奇绝技的平均净收益仍高于常见绝技', () => {
    expect(meanGainOf('legendary')).toBeGreaterThan(meanGainOf('common'))
  })

  it('稀有度的名义加成按档位排开：常见 < 罕见 < 招牌 < 传奇', () => {
    const means = RARITY_ORDER.map((rarity) => nominalMeanOf(rarity))
    for (let index = 1; index < means.length; index += 1) {
      expect(means[index]).toBeGreaterThan(means[index - 1])
    }
  })

  it('任何绝技的实战净收益都不越过自己稀有度的预算', () => {
    const overshoot = GAINS.filter(
      (gain) => !gain.constant && gain.gain > RARITY_CHANCE_BUDGET[gain.rarity] + 0.0005,
    ).map((gain) => `${gain.key} +${gain.gain}`)
    expect(overshoot).toEqual([])
  })

  it('满级绝技叠满属性也顶不破 0.92 的硬上限', () => {
    expect(bestCaseChance()).toBeLessThanOrEqual(HARD_CEILING)
  })

  it('保守型常量选项不给绝技让路，挂满级也还是那个固定值', () => {
    const onConstant = GAINS.filter((gain) => gain.constant)
    expect(onConstant.length).toBeGreaterThan(0)
    expect(onConstant.filter((gain) => gain.gain !== 0).map((gain) => gain.key)).toEqual([])
  })
})
