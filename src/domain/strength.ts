import { overall, positionGroup, round1 } from './attributes'
import type { Club, Id, Player } from './types'

type Line = 'GK' | 'DEF' | 'MID' | 'FWD'

function emptyStrength(): Club['strength'] {
  return { attack: 40, midfield: 40, defense: 40, overall: 40 }
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

function lineAverage(lineup: Player[], group: Line, fallback: number): number {
  const line = lineup.filter((p) => positionGroup(p.position) === group)
  if (line.length === 0) return fallback
  return line.reduce((sum, p) => sum + overall(p), 0) / line.length
}

export function computeClubStrength(
  club: Club,
  players: Record<Id, Player>,
  options?: { forcePlayerId?: Id; excludePlayerId?: Id },
): Club['strength'] {
  const squad = club.squadIds
    .map((id) => players[id])
    .filter((player): player is Player => Boolean(player) && player.id !== options?.excludePlayerId)
  if (squad.length === 0) return emptyStrength()

  const groups = groupSquad(squad)
  const { lineup, used } = pickStartingEleven(groups)
  if (options?.forcePlayerId) forcePlayerIntoLineup(lineup, used, players[options.forcePlayerId])
  fillRemaining(lineup, used, squad)

  const gk = lineAverage(lineup, 'GK', 40)
  const def = lineAverage(lineup, 'DEF', 40)
  const mid = lineAverage(lineup, 'MID', 40)
  const fwd = lineAverage(lineup, 'FWD', 40)
  return {
    attack: round1(fwd * 0.58 + mid * 0.42),
    midfield: round1(mid),
    defense: round1(def * 0.64 + gk * 0.36),
    overall: round1(gk * 0.1 + def * 0.28 + mid * 0.3 + fwd * 0.32),
  }
}
