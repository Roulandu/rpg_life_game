import { overall, positionGroup, round1 } from './attributes'
import { selectLineup } from './lineup'
import type { Club, Id, Player } from './types'

type Line = 'GK' | 'DEF' | 'MID' | 'FWD'

function emptyStrength(): Club['strength'] {
  return { attack: 40, midfield: 40, defense: 40, overall: 40 }
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
  const lineup = selectLineup(club, players, options)
  if (lineup.length === 0) return emptyStrength()

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
