import { describe, expect, it } from 'vitest'
import { ATTR_KEYS, allMoves } from '../../src/domain'
import type { KeyMomentKind, MatchReport, Player, PlayerMove, WorldState } from '../../src/domain'
import { optionsFor } from '../../src/engine/data/keyMomentOptions'
import type { OpponentPair } from '../../src/engine/data/scoreChance'
import { startWeek } from '../../src/engine/turn'
import { KINDS, strongPlayer } from '../fixtures/keyMomentKinds'
import { PLAN, readyWorld } from '../fixtures/matchday'
import { rival } from '../fixtures/keyMomentRivals'

/** 属性拉到 55：既留足上升空间，又不至于被选项上下界夹住看不出差异。 */
function midPlayer(moves: PlayerMove[]): Player {
  const player = strongPlayer()
  for (const key of ATTR_KEYS) player.attributes[key] = 55
  return { ...player, moves }
}

function barePlayer(): Player {
  const player = midPlayer([])
  delete player.moves
  return player
}

const softFoes: OpponentPair = {
  keeper: rival({ goalkeeping: 45 }),
  marker: rival({ defending: 45 }),
  shooter: rival({ shooting: 45 }),
}

const eliteKeeperFoes: OpponentPair = {
  ...softFoes,
  keeper: rival({ goalkeeping: 92, pace: 88, mental: 86 }),
}

function optionOf(player: Player, kind: KeyMomentKind, optionId: string, foes: OpponentPair) {
  const found = optionsFor(kind, { player, isHome: true, opponents: foes }).find(
    (option) => option.id === optionId,
  )
  if (!found) throw new Error(`选项不存在：${kind}:${optionId}`)
  return found
}

function held(moveId: string): PlayerMove[] {
  return [{ moveId, level: 3, progress: 0 }]
}

describe('绝技进关键回合概率', () => {
  it('回归: 每条绝技都至少真正抬高一个选项的成功率', () => {
    const bare = midPlayer([])
    const dead: string[] = []
    for (const move of allMoves()) {
      const holder = midPlayer([{ moveId: move.id, level: 3, progress: 0 }])
      const effective = move.targets.some((target) => {
        const [kind, optionId] = target.split(':') as [KeyMomentKind, string]
        return (
          optionOf(holder, kind, optionId, softFoes).successChance >
          optionOf(bare, kind, optionId, softFoes).successChance
        )
      })
      if (!effective) dead.push(move.id)
    }
    expect(dead).toEqual([])
  })

  it('依据行写出绝技名与等级，玩家能看懂这一档给了多少', () => {
    const option = optionOf(midPlayer(held('mv_rainbow')), 'oneOnOne', 'round', softFoes)

    expect(option.successBasisZh).toContain('彩虹过人 Ⅲ +10%')
    expect(option.successChance).toBeGreaterThan(
      optionOf(midPlayer([]), 'oneOnOne', 'round', softFoes).successChance,
    )
  })

  it('对位对手越强绝技净收益越小，压制单独写成一条依据', () => {
    const holder = midPlayer(held('mv_chip_over_keeper'))
    const soft = optionOf(holder, 'oneOnOne', 'chipKeeper', softFoes)
    const elite = optionOf(holder, 'oneOnOne', 'chipKeeper', eliteKeeperFoes)

    expect(elite.successChance).toBeLessThan(soft.successChance)
    expect(soft.successBasisZh).toContain('对手门将 速度')
    expect(elite.successBasisZh).toContain('对手门将 速度 88')
  })
})

describe('绝技接入的边界', () => {
  it('常量选项不给绝技让路，依据仍是自带的一句话', () => {
    const holder = midPlayer(held('mv_aerial_shield'))
    const option = optionOf(holder, 'headerDuel', 'holdUp', softFoes)

    expect(option.successChance).toBe(
      optionOf(midPlayer([]), 'headerDuel', 'holdUp', softFoes).successChance,
    )
    expect(option.successBasisZh).not.toContain('空中占位')
  })

  it('没有绝技字段与空列表走同一条路，概率与依据都不变', () => {
    for (const kind of KINDS) {
      const empty = optionsFor(kind, { player: midPlayer([]), isHome: true, opponents: softFoes })
      const absent = optionsFor(kind, { player: barePlayer(), isHome: true, opponents: softFoes })

      expect(empty.map((option) => option.successChance)).toEqual(
        absent.map((option) => option.successChance),
      )
      expect(empty.map((option) => option.successBasisZh)).toEqual(
        absent.map((option) => option.successBasisZh),
      )
    }
  })

  it('回归: 关键回合生成后再学会的绝技，不会改写已经锁死的概率', () => {
    const { world, report } = liveMatch()
    const before = storedChances(report)

    const user = world.players[world.playerId] as Player
    user.moves = allMoves().slice(0, 12).map((move) => ({ moveId: move.id, level: 3, progress: 0 }))

    expect(storedChances(world.lastMatch as MatchReport)).toEqual(before)
  })
})

function liveMatch(): { world: WorldState; report: MatchReport } {
  const result = startWeek(readyWorld(2026), PLAN)
  const report = result.world.lastMatch as MatchReport
  expect(report.status).toBe('live')
  return { world: result.world, report }
}

function storedChances(report: MatchReport): Record<string, number> {
  const map: Record<string, number> = {}
  for (const moment of report.keyMoments ?? []) {
    for (const option of moment.options) map[`${moment.id}:${option.id}`] = option.successChance
  }
  return map
}
