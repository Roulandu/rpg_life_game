import { describe, expect, it } from 'vitest'
import { positionGroup } from '../../src/domain'
import type { MatchLineups, MatchReport, Player, WorldState } from '../../src/domain'
import { resolveOpponents } from '../../src/engine/matchOpponent'
import { startWeek } from '../../src/engine/turn'
import { hashState } from '../../src/lib'
import { PLAN, readyWorld } from '../fixtures/matchday'

function liveWorld(seed = 2026): WorldState {
  const world = startWeek(readyWorld(seed), PLAN).world
  expect(world.lastMatch?.status).toBe('live')
  return world
}

function lineupsOf(report: MatchReport): MatchLineups {
  if (!report.lineups) throw new Error('live 比赛缺少首发阵容')
  return report.lineups
}

interface FoeTrio {
  keeper: Player
  marker: Player
  shooter: Player
}

function trio(world: WorldState, report: MatchReport): FoeTrio {
  const foes = resolveOpponents(world, report)
  if (!foes?.keeper || !foes.marker || !foes.shooter) throw new Error('对手解析缺少三名对位球员')
  return { keeper: foes.keeper, marker: foes.marker, shooter: foes.shooter }
}

describe('关键回合的对手解析', () => {
  it('从对手首发里取出门将、盯人后卫与出手前锋', () => {
    const world = liveWorld()
    const report = world.lastMatch as MatchReport
    const foes = trio(world, report)

    expect(positionGroup(foes.keeper.position)).toBe('GK')
    expect(positionGroup(foes.marker.position)).toBe('DEF')
    expect(['FWD', 'MID']).toContain(positionGroup(foes.shooter.position))
  })

  it('解析出来的一定是对面的人，不是自家队友', () => {
    const world = liveWorld()
    const report = world.lastMatch as MatchReport
    const userSide = report.homeId === world.clubId ? lineupsOf(report).home : lineupsOf(report).away
    const mine = new Set(userSide.map((entry) => entry.id))
    const foes = trio(world, report)

    for (const player of [foes.keeper, foes.marker, foes.shooter]) {
      expect(mine.has(player.id)).toBe(false)
    }
  })

  it('后卫取防守最强者、前锋取射门最强者', () => {
    const world = liveWorld()
    const report = world.lastMatch as MatchReport
    const squad = lineupsOf(report)[report.homeId === world.clubId ? 'away' : 'home']
      .map((entry) => world.players[entry.id])
      .filter((player): player is NonNullable<typeof player> => Boolean(player))
    const defenders = squad.filter((player) => positionGroup(player.position) === 'DEF')
    const forwards = squad.filter((player) => positionGroup(player.position) === 'FWD')
    const foes = trio(world, report)

    expect(foes.marker.attributes.defending).toBe(
      Math.max(...defenders.map((player) => player.attributes.defending)),
    )
    const pool = forwards.length > 0 ? forwards : squad.filter((p) => positionGroup(p.position) === 'MID')
    expect(foes.shooter.attributes.shooting).toBe(
      Math.max(...pool.map((player) => player.attributes.shooting)),
    )
  })

  it('解析是纯读取：结果稳定、不消耗随机也不改状态', () => {
    const world = liveWorld()
    const report = world.lastMatch as MatchReport
    const before = hashState(world)

    const first = resolveOpponents(world, report)
    const second = resolveOpponents(world, report)

    expect(second).toEqual(first)
    expect(hashState(world)).toBe(before)
  })

  it('阵容缺失时返回 null，让选项退回不看对手的算法', () => {
    const world = liveWorld()
    const report = world.lastMatch as MatchReport
    const empty = { homeId: report.homeId, awayId: report.awayId, lineups: { home: [], away: [] } }

    expect(resolveOpponents(world, empty)).toBeNull()
  })
})
