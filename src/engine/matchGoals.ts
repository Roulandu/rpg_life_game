import { clamp, positionGroup } from '../domain/attributes'
import type { Club, Id, Player, WorldState } from '../domain/types'
import type { Rng } from '../lib/rng'

export interface GoalContribution {
  scorer: Player
  assist: Player | null
  minute: number
  side: 'home' | 'away'
}

interface GoalContext {
  world: WorldState
  club: Club
  rng: Rng
  userClubId: Id
  userPlaying: boolean
}

export function expectedGoals(attack: number, defense: number, home: boolean): number {
  const base = home ? 1.3 : 1.1
  const advantage = home ? 0.18 : 0
  return clamp(base + (attack - defense) * 0.055 + advantage, 0.15, 4.2)
}

export function styleModifier(club: Club): number {
  switch (club.style) {
    case 'counter':
      return 0.08
    case 'highPress':
      return 0.06
    case 'possession':
      return 0.03
    case 'direct':
      return 0.05
  }
}

function pickScorer({ world, club, rng, userClubId, userPlaying }: GoalContext): Player {
  const squad = club.squadIds
    .map((id) => world.players[id])
    .filter((player): player is Player => Boolean(player))
  const candidates = squad.map((player) => {
    const group = positionGroup(player.position)
    let weight =
      group === 'FWD' ? 4.2 : group === 'MID' ? 1.8 : group === 'DEF' ? 0.45 : 0.02
    weight *= 0.5 + player.attributes.shooting / 100
    if (player.isUser) {
      weight = player.id === world.playerId && userPlaying && club.id === userClubId
        ? weight * 1.4
        : 0
    }
    return { value: player, weight }
  })
  return rng.weighted(candidates)
}

function pickAssister(context: GoalContext, scorer: Player): Player | null {
  const { world, club, rng, userClubId, userPlaying } = context
  if (!rng.chance(0.7)) return null
  const squad = club.squadIds
    .map((id) => world.players[id])
    .filter((player): player is Player => Boolean(player) && player.id !== scorer.id)
  const candidates = squad.map((player) => {
    const group = positionGroup(player.position)
    let weight =
      (0.5 + player.attributes.passing / 100) *
      (group === 'MID' ? 1.5 : group === 'FWD' ? 1.2 : group === 'DEF' ? 0.55 : 0.08)
    if (player.isUser) {
      weight = player.id === world.playerId && userPlaying && club.id === userClubId
        ? weight * 1.3
        : 0
    }
    return { value: player, weight }
  })
  return rng.weighted(candidates)
}

interface GoalContributionInput {
  world: WorldState
  homeClub: Club
  awayClub: Club
  homeGoals: number
  awayGoals: number
  rng: Rng
  userPlaying: boolean
}

function contributionsForSide(
  input: GoalContributionInput,
  club: Club,
  goals: number,
  side: GoalContribution['side'],
): GoalContribution[] {
  const context: GoalContext = {
    world: input.world,
    club,
    rng: input.rng,
    userClubId: input.world.clubId,
    userPlaying: input.userPlaying,
  }
  const contributions: GoalContribution[] = []
  for (let i = 0; i < goals; i += 1) {
    const scorer = pickScorer(context)
    const assist = pickAssister(context, scorer)
    contributions.push({ scorer, assist, minute: input.rng.int(1, 90), side })
  }
  return contributions
}

export function makeGoalContributions(input: GoalContributionInput): GoalContribution[] {
  const home = contributionsForSide(input, input.homeClub, input.homeGoals, 'home')
  const away = contributionsForSide(input, input.awayClub, input.awayGoals, 'away')
  return [...home, ...away].sort((a, b) => a.minute - b.minute)
}

export function pickInjuryKind(rng: Rng): string {
  return rng.pick(['脚踝扭伤', '大腿肌肉拉伤', '膝盖不适', '腹股沟拉伤', '疲劳性损伤'])
}
