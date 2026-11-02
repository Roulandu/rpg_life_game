import { ATTR_KEYS, allMoves, moveFitsPosition } from '../../src/domain'
import type {
  AttrKey,
  KeyMoment,
  KeyMomentKind,
  MatchReport,
  Player,
  Position,
  WorldState,
} from '../../src/domain'
import { generateKeyMoments, playDay } from '../../src/engine'
import { optionsFor } from '../../src/engine/data/keyMomentOptions'
import type { OpponentPair } from '../../src/engine/data/scoreChance'
import { createRng } from '../../src/lib'
import { generateWorld } from '../../src/world/generator'
import { rival } from './keyMomentRivals'
import { TEST_NOW, testOptions } from './career'

/** 一个位置的样本球员：所有属性拉平，绝技按需挂满级，用来量概率而不是量运气。 */
export function balancePlayer(level = 0, moveId = ''): Player {
  const world = generateWorld(testOptions(), TEST_NOW)
  const player = world.players[world.playerId] as Player
  for (const key of ATTR_KEYS) player.attributes[key] = 62
  player.moves = level === 0 ? [] : [{ moveId, level, progress: 0 }]
  return player
}

export function setAttributes(player: Player, value: number): Player {
  const attributes = { ...player.attributes }
  for (const key of ATTR_KEYS) attributes[key as AttrKey] = value
  return { ...player, attributes }
}

/** 对抗强度拉满的后卫与门将：绝技的净收益要在最硬的对手面前量。 */
export function eliteFoes(): OpponentPair {
  return {
    keeper: rival({ goalkeeping: 90, mental: 78, pace: 62 }),
    marker: rival({ defending: 88, pace: 78 }),
    shooter: rival({ shooting: 90, dribbling: 84, physical: 76 }),
  }
}

/** 一类关键回合的整张选项表：只给对抗强度，不问引擎要第二套概率。 */
export function optionsOf(player: Player, opponents: OpponentPair | null, kind: KeyMomentKind) {
  return optionsFor(kind, { player, isHome: true, opponents })
}

/** 某个选项在给定对抗下的冻结概率；选项不存在给 null，让调用方能区分「死数据」。 */
export function chanceOf(
  player: Player,
  opponents: OpponentPair | null,
  kind: KeyMomentKind,
  optionId: string,
): number | null {
  const found = optionsOf(player, opponents, kind).find((option) => option.id === optionId)
  return found ? found.successChance : null
}

/**
 * 常量选项：把「我的属性」从 20 拉到 90 概率不动，而且依据行里没有任何百分比项。
 * 只看概率会被「只吃对抗项的选项」骗过，所以两条一起判。
 */
export function isConstantOption(
  player: Player,
  opponents: OpponentPair | null,
  kind: KeyMomentKind,
  optionId: string,
): boolean {
  const find = (value: number) =>
    optionsOf(setAttributes(player, value), opponents, kind).find((option) => option.id === optionId)
  const low = find(20)
  const high = find(90)
  if (!low || !high) return false
  return low.successChance === high.successChance && !(low.successBasisZh ?? '').includes('%')
}

/**
 * 某个位置组真能碰上的关键回合类型：反复调用引擎的生成器抽样出来，
 * 不在测试里重抄一份 kindPool 表——引擎改了池子，这里跟着变。
 */
export function kindsSeenBy(position: Position, samples = 200): Set<KeyMomentKind> {
  const player = { ...balancePlayer(), position }
  const seen = new Set<KeyMomentKind>()
  for (let index = 0; index < samples; index += 1) {
    const rng = createRng(1000 + index, 'balance-probe', position)
    for (const moment of generateKeyMoments({ player, rng, minutes: 90, isHome: true })) {
      seen.add(moment.kind)
    }
  }
  return seen
}

const GROUP_SAMPLE: Record<string, Position> = { GK: 'GK', DEF: 'CB', MID: 'CM', FWD: 'ST' }

/** 位置组 → 该组抽得出的关键回合类型集合。 */
export function kindsSeenByGroup(group: string): Set<KeyMomentKind> {
  return kindsSeenBy(GROUP_SAMPLE[group] as Position)
}

export interface SeasonBalance {
  matches: number
  moments: number
  avgOffered: number
  avgChosen: number
  winRate: number
  offeredMax: number
  offeredMin: number
  kinds: KeyMomentKind[]
  topDefaultShare: number
  optionIdsByKind: Record<string, string[]>
}

interface SeasonTally {
  matches: number
  moments: number
  wins: number
  chosen: number[]
  offered: number[]
  kinds: Set<KeyMomentKind>
  defaults: Map<string, number>
  optionIds: Map<string, Set<string>>
}

function recordMoment(tally: SeasonTally, moment: KeyMoment): void {
  tally.moments += 1
  tally.kinds.add(moment.kind)
  const ids = tally.optionIds.get(moment.kind) ?? new Set<string>()
  for (const option of moment.options) {
    tally.offered.push(option.successChance)
    ids.add(option.id)
  }
  tally.optionIds.set(moment.kind, ids)
  const safest = moment.options.find((option) => option.id === moment.defaultOptionId)
  if (!safest) return
  tally.chosen.push(safest.successChance)
  const key = `${moment.kind}:${moment.defaultOptionId}`
  tally.defaults.set(key, (tally.defaults.get(key) ?? 0) + 1)
  if (moment.outcome?.success) tally.wins += 1
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / (values.length || 1)
}

/** 自动推进一整季：只统计用户那场球的关键回合，同一场不重复计入。 */
export function replaySeason(seed: number, moveLevel: 0 | 3): SeasonBalance {
  let world: WorldState = generateWorld(testOptions({ seed }), TEST_NOW)
  const user = world.players[world.playerId] as Player
  user.moves =
    moveLevel === 0
      ? []
      : allMoves()
          .filter((move) => moveFitsPosition(move, user.position))
          .map((move) => ({ moveId: move.id, level: moveLevel, progress: 0 }))
  const tally: SeasonTally = {
    matches: 0,
    moments: 0,
    wins: 0,
    chosen: [],
    offered: [],
    kinds: new Set(),
    defaults: new Map(),
    optionIds: new Map(),
  }
  const seen = new Set<string>()
  for (let index = 0; index < 300 && !world.retired; index += 1) {
    const result = playDay(world, { autoResolve: true })
    world = result.world
    const report = world.lastMatch as MatchReport | null
    if (report && report.status === 'final' && !seen.has(report.fixtureId)) {
      seen.add(report.fixtureId)
      tally.matches += 1
      for (const moment of report.keyMoments ?? []) recordMoment(tally, moment)
    }
    if (result.seasonTransition) break
  }
  const topDefault = Math.max(0, ...tally.defaults.values())
  return {
    matches: tally.matches,
    moments: tally.moments,
    avgOffered: mean(tally.offered),
    avgChosen: mean(tally.chosen),
    winRate: tally.wins / (tally.moments || 1),
    offeredMax: Math.max(0, ...tally.offered),
    offeredMin: Math.min(1, ...tally.offered),
    kinds: [...tally.kinds],
    topDefaultShare: topDefault / (tally.moments || 1),
    optionIdsByKind: Object.fromEntries([...tally.optionIds].map(([k, v]) => [k, [...v].sort()])),
  }
}
