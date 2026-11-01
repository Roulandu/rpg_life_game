import { describe, expect, it } from 'vitest'
import { buildMatchLineups, positionGroup, selectLineup } from '../../src/domain'
import type { MatchReport } from '../../src/domain'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

function reportFor(homeId: string, awayId: string, userPlayed = true): MatchReport {
  return { homeId, awayId, userPlayed } as MatchReport
}

describe('selectLineup', () => {
  const world = generateWorld(testOptions({ seed: 2026 }), TEST_NOW)
  const club = world.clubs[world.clubId]!

  it('首发阵容固定为 1 门将 4 后卫 4 中场 2 前锋，且同一俱乐部输出稳定', () => {
    const lineup = selectLineup(club, world.players)

    expect(lineup).toHaveLength(11)
    const counts = { GK: 0, DEF: 0, MID: 0, FWD: 0 }
    for (const player of lineup) counts[positionGroup(player.position)] += 1
    expect(counts).toEqual({ GK: 1, DEF: 4, MID: 4, FWD: 2 })
    expect(selectLineup(club, world.players).map((player) => player.id)).toEqual(
      lineup.map((player) => player.id),
    )
  })

  it('用户首发时被强制选入首发，未出场时不出现在首发', () => {
    const user = world.players[world.playerId]!

    const forced = selectLineup(club, world.players, { forcePlayerId: user.id })
    expect(forced.some((player) => player.id === user.id)).toBe(true)
    expect(forced).toHaveLength(11)

    const excluded = selectLineup(club, world.players, { excludePlayerId: user.id })
    expect(excluded.some((player) => player.id === user.id)).toBe(false)
    expect(excluded).toHaveLength(11)
  })
})

describe('buildMatchLineups', () => {
  const world = generateWorld(testOptions({ seed: 2026 }), TEST_NOW)
  const homeClub = world.clubs[world.clubId]!
  const awayClub = Object.values(world.clubs).find((club) => club.id !== homeClub.id)!

  it('为主客双方各生成 11 人首发并标记用户与号码', () => {
    const lineups = buildMatchLineups(world, reportFor(homeClub.id, awayClub.id))

    expect(lineups.home).toHaveLength(11)
    expect(lineups.away).toHaveLength(11)
    expect(lineups.home.filter((player) => player.isUser)).toHaveLength(1)
    expect(lineups.away.every((player) => !player.isUser)).toBe(true)
    expect(lineups.home.every((player) => player.number > 0)).toBe(true)
    expect(new Set(lineups.home.map((player) => player.number)).size).toBe(11)
  })

  it('用户未出场时主队首发不包含用户', () => {
    const lineups = buildMatchLineups(world, reportFor(homeClub.id, awayClub.id, false))

    expect(lineups.home.every((player) => !player.isUser)).toBe(true)
  })

  it('首发条目同时带原名与中文名，中文名取自球员本人', () => {
    const lineups = buildMatchLineups(world, reportFor(homeClub.id, awayClub.id))

    for (const entry of [...lineups.home, ...lineups.away]) {
      const player = world.players[entry.id]!
      expect(entry.name).toBe(player.name)
      expect(entry.nameZh).toBe(player.nameZh)
    }
  })
})

describe('阵容边界', () => {
  const world = generateWorld(testOptions({ seed: 2026 }), TEST_NOW)
  const pool = Object.values(world.players).filter((player) => player.id !== world.playerId)

  /** 用同一批中场拼一个「没有门将、没有前锋」的阵容，逼出补位与号码顺延分支。 */
  function midOnlyClub(count: number, id: string) {
    const squad = pool.filter((player) => player.position === 'CM').slice(0, count)
    expect(squad.length).toBe(count)
    return { ...world.clubs[id]!, squadIds: squad.map((player) => player.id) }
  }

  it('没有门将的阵容靠剩余球员补满 11 人，号码冲突时顺延到 12 以后', () => {
    const club = midOnlyClub(12, world.clubId)

    const lineup = selectLineup(club, world.players)
    expect(lineup).toHaveLength(11)
    expect(lineup.some((player) => player.position === 'GK')).toBe(false)

    const lineups = buildMatchLineups(
      { ...world, clubs: { ...world.clubs, [club.id]: club } },
      { homeId: club.id, awayId: club.id, userPlayed: false } as MatchReport,
    )
    const numbers = lineups.home.map((player) => player.number)
    expect(new Set(numbers).size).toBe(numbers.length)
    expect(Math.max(...numbers)).toBeGreaterThanOrEqual(12)
  })

  it('强制选入阵容里没有的位置时，替换掉评分最低的首发', () => {
    const club = midOnlyClub(11, world.clubId)
    const striker = pool.find((player) => player.position === 'ST' && !club.squadIds.includes(player.id))!

    const lineup = selectLineup(club, world.players, { forcePlayerId: striker.id })

    expect(lineup).toHaveLength(11)
    expect(lineup.some((player) => player.id === striker.id)).toBe(true)
  })

  it('空阵容返回空首发，俱乐部缺失时该侧首发为空而不是报错', () => {
    const empty = { ...world.clubs[world.clubId]!, squadIds: [] }
    expect(selectLineup(empty, world.players)).toEqual([])

    const lineups = buildMatchLineups(
      world,
      { homeId: 'club:missing', awayId: empty.id, userPlayed: false } as MatchReport,
    )
    expect(lineups.home).toEqual([])
  })
})
