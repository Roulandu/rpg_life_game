import { createRng, type Rng } from '../lib/rng'
import type { Fixture, Id, League } from './types'

interface RoundPair {
  homeId: Id
  awayId: Id
}

interface VenueState {
  last: 'H' | 'A' | null
  home: number
  away: number
  streak: number
}

function createVenueScheduler(): {
  venuePenalty: (teamId: Id, venue: 'H' | 'A', round: number) => number
  applyVenue: (teamId: Id, venue: 'H' | 'A') => void
} {
  const venueState = new Map<Id, VenueState>()
  const stateOf = (teamId: Id): VenueState => {
    let state = venueState.get(teamId)
    if (!state) {
      state = { last: null, home: 0, away: 0, streak: 0 }
      venueState.set(teamId, state)
    }
    return state
  }
  const venuePenalty = (teamId: Id, venue: 'H' | 'A', round: number): number => {
    const state = stateOf(teamId)
    let penalty = 0
    if (state.last === venue) penalty += state.streak >= 2 ? 100 : 12
    const targetHome = (round + 1) / 2
    const nextHome = state.home + (venue === 'H' ? 1 : 0)
    penalty += Math.abs(nextHome - targetHome) * 3
    return penalty
  }
  const applyVenue = (teamId: Id, venue: 'H' | 'A'): void => {
    const state = stateOf(teamId)
    state.streak = state.last === venue ? state.streak + 1 : 1
    state.last = venue
    if (venue === 'H') state.home += 1
    else state.away += 1
  }
  return { venuePenalty, applyVenue }
}

function rotate(rotation: Id[]): Id[] | null {
  const fixed = rotation[0]
  const rest = rotation.slice(1)
  const last = rest.pop()
  if (!last || !fixed) return null
  rest.unshift(last)
  return [fixed, ...rest]
}

function makeRoundRobin(teamIds: Id[], rng: Rng): RoundPair[][] {
  const teams = rng.shuffle(teamIds)
  if (teams.length % 2 !== 0) teams.pop()
  const n = teams.length
  const rounds: RoundPair[][] = []
  let rotation = [...teams]
  const { venuePenalty, applyVenue } = createVenueScheduler()

  for (let round = 0; round < n - 1; round += 1) {
    const pairs: RoundPair[] = []
    for (let i = 0; i < n / 2; i += 1) {
      const a = rotation[i]
      const b = rotation[n - 1 - i]
      if (!a || !b) continue
      const aHome = venuePenalty(a, 'H', round) + venuePenalty(b, 'A', round)
      const bHome = venuePenalty(b, 'H', round) + venuePenalty(a, 'A', round)
      const aHosts = aHome < bHome || (aHome === bHome && (round + i) % 2 === 0)
      pairs.push(aHosts ? { homeId: a, awayId: b } : { homeId: b, awayId: a })
      applyVenue(a, aHosts ? 'H' : 'A')
      applyVenue(b, aHosts ? 'A' : 'H')
    }
    rounds.push(pairs)
    const next = rotate(rotation)
    if (!next) break
    rotation = next
  }
  const secondHalf = rounds.map((roundPairs) =>
    roundPairs.map((pair) => ({ homeId: pair.awayId, awayId: pair.homeId })),
  )
  return [...rounds, ...secondHalf]
}

export function generateFixtures(
  leagues: Record<Id, League>,
  seed: number,
  season: number,
): Record<Id, Fixture> {
  const fixtures: Record<Id, Fixture> = {}
  for (const league of Object.values(leagues)) {
    const rng = createRng(seed, 'fixtures', league.id, season)
    const rounds = makeRoundRobin(league.clubIds, rng)
    rounds.forEach((round, roundIndex) => {
      round.forEach((pair, matchIndex) => {
        const week = roundIndex + 1
        const id = `fixture:${league.id}:${season}:${String(week).padStart(2, '0')}:${matchIndex}`
        fixtures[id] = {
          id,
          competitionId: league.id,
          season,
          week,
          round: roundIndex + 1,
          homeId: pair.homeId,
          awayId: pair.awayId,
          status: 'scheduled',
          report: null,
        }
      })
    })
  }
  return fixtures
}
