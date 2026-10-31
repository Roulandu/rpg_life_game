import { clamp, positionGroup } from '../domain'
import type { Club, Id, Player, WorldState } from '../domain'
import type { Rng } from '../lib'

export interface GoalContext {
  world: WorldState
  club: Club
  rng: Rng
  userClubId: Id
  minute: number
  userEntryMinute: number
  userPlayed: boolean
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

function userWeight(context: GoalContext, player: Player, weight: number, multiplier: number): number {
  if (!player.isUser) return weight
  const eligible =
    context.userPlayed &&
    player.id === context.world.playerId &&
    context.club.id === context.userClubId &&
    context.minute >= context.userEntryMinute
  return eligible ? weight * multiplier : 0
}

export function pickScorer(context: GoalContext): Player {
  const squad = context.club.squadIds
    .map((id) => context.world.players[id])
    .filter((player): player is Player => Boolean(player))
  const candidates = squad.map((player) => {
    const group = positionGroup(player.position)
    const base =
      group === 'FWD' ? 4.2 : group === 'MID' ? 1.8 : group === 'DEF' ? 0.45 : 0.02
    const weight = base * (0.5 + player.attributes.shooting / 100)
    return { value: player, weight: userWeight(context, player, weight, 1.4) }
  })
  return context.rng.weighted(candidates)
}

export function pickAssister(context: GoalContext, scorer: Player): Player | null {
  if (!context.rng.chance(0.7)) return null
  const squad = context.club.squadIds
    .map((id) => context.world.players[id])
    .filter((player): player is Player => Boolean(player) && player.id !== scorer.id)
  const candidates = squad.map((player) => {
    const group = positionGroup(player.position)
    const base =
      (0.5 + player.attributes.passing / 100) *
      (group === 'MID' ? 1.5 : group === 'FWD' ? 1.2 : group === 'DEF' ? 0.55 : 0.08)
    return { value: player, weight: userWeight(context, player, base, 1.3) }
  })
  return context.rng.weighted(candidates)
}

export function pickInjuryKind(rng: Rng): string {
  return rng.pick(['脚踝扭伤', '大腿肌肉拉伤', '膝盖不适', '腹股沟拉伤', '疲劳性损伤'])
}
