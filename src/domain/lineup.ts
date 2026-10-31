import { overall, positionGroup } from './attributes'
import type { Club, Id, Player, Position } from './types'
import type { MatchLineups, MatchLineupPlayer, MatchReport } from './matchTypes'
import type { WorldState } from './types'

type Line = 'GK' | 'DEF' | 'MID' | 'FWD'

export interface LineupOptions {
  forcePlayerId?: Id
  excludePlayerId?: Id
}

function groupSquad(squad: Player[]): Record<Line, Player[]> {
  const groups: Record<Line, Player[]> = { GK: [], DEF: [], MID: [], FWD: [] }
  for (const player of squad) groups[positionGroup(player.position)].push(player)
  for (const group of Object.values(groups)) {
    group.sort((a, b) => overall(b) - overall(a) || a.id.localeCompare(b.id))
  }
  return groups
}

function pickStartingEleven(groups: Record<Line, Player[]>): { lineup: Player[]; used: Set<Id> } {
  const lineup: Player[] = []
  const used = new Set<Id>()
  const takeGroup = (group: Player[], count: number): void => {
    for (const player of group) {
      if (lineup.length >= 11 || used.has(player.id)) break
      if (lineup.filter((p) => positionGroup(p.position) === positionGroup(player.position)).length >= count) break
      lineup.push(player)
      used.add(player.id)
    }
  }
  takeGroup(groups.GK, 1)
  takeGroup(groups.DEF, 4)
  takeGroup(groups.MID, 4)
  takeGroup(groups.FWD, 2)
  return { lineup, used }
}

function forcePlayerIntoLineup(lineup: Player[], used: Set<Id>, forced: Player | undefined): void {
  if (!forced || used.has(forced.id)) return
  const groupKey = positionGroup(forced.position)
  const sameGroupIndex = lineup.findIndex((p) => positionGroup(p.position) === groupKey)
  if (sameGroupIndex >= 0) {
    used.delete(lineup[sameGroupIndex].id)
    lineup[sameGroupIndex] = forced
  } else if (lineup.length < 11) {
    lineup.push(forced)
  } else {
    const replacement = lineup
      .map((p, index) => ({ p, index }))
      .sort((a, b) => overall(a.p) - overall(b.p))[0]
    if (replacement) {
      used.delete(replacement.p.id)
      lineup[replacement.index] = forced
    }
  }
  used.add(forced.id)
}

function fillRemaining(lineup: Player[], used: Set<Id>, squad: Player[]): void {
  for (const player of squad) {
    if (lineup.length >= 11) break
    if (!used.has(player.id)) {
      lineup.push(player)
      used.add(player.id)
    }
  }
}

export function selectLineup(
  club: Club,
  players: Record<Id, Player>,
  options?: LineupOptions,
): Player[] {
  const squad = club.squadIds
    .map((id) => players[id])
    .filter((player): player is Player => Boolean(player) && player.id !== options?.excludePlayerId)
  if (squad.length === 0) return []

  const groups = groupSquad(squad)
  const { lineup, used } = pickStartingEleven(groups)
  if (options?.forcePlayerId) forcePlayerIntoLineup(lineup, used, players[options.forcePlayerId])
  fillRemaining(lineup, used, squad)
  return lineup
}

const GROUP_NUMBERS: Record<Line, number[]> = {
  GK: [1],
  DEF: [2, 3, 4, 5],
  MID: [6, 7, 8, 9],
  FWD: [10, 11],
}

function lineupPlayer(player: Player, number: number): MatchLineupPlayer {
  return {
    id: player.id,
    name: player.name,
    number,
    position: player.position,
    isUser: player.isUser,
  }
}

function toMatchLineup(lineup: Player[]): MatchLineupPlayer[] {
  const used = new Set<number>()
  const nextGroupIndex: Record<Line, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 }
  const assignNumber = (position: Position): number => {
    const group = positionGroup(position)
    const candidates = GROUP_NUMBERS[group]
    const index = nextGroupIndex[group]
    const candidate = candidates[Math.min(index, candidates.length - 1)]
    nextGroupIndex[group] += 1
    if (candidate == null || used.has(candidate)) {
      let fallback = 12
      while (used.has(fallback)) fallback += 1
      used.add(fallback)
      return fallback
    }
    used.add(candidate)
    return candidate
  }
  return lineup.map((player) => lineupPlayer(player, assignNumber(player.position)))
}

type LineupReport = Pick<MatchReport, 'homeId' | 'awayId' | 'userPlayed'>

function lineupOptionsFor(
  world: WorldState,
  report: LineupReport,
  clubId: Id,
): LineupOptions | undefined {
  if (clubId !== world.clubId) return undefined
  return report.userPlayed
    ? { forcePlayerId: world.playerId }
    : { excludePlayerId: world.playerId }
}

export function buildMatchLineups(world: WorldState, report: LineupReport): MatchLineups {
  const homeClub = world.clubs[report.homeId]
  const awayClub = world.clubs[report.awayId]
  return {
    home: homeClub
      ? toMatchLineup(selectLineup(homeClub, world.players, lineupOptionsFor(world, report, homeClub.id)))
      : [],
    away: awayClub
      ? toMatchLineup(selectLineup(awayClub, world.players, lineupOptionsFor(world, report, awayClub.id)))
      : [],
  }
}
