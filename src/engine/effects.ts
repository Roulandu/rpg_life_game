import { clamp } from '../domain/attributes'
import type { Effect, WorldState } from '../domain/types'
import { adjustRelationship, adjustRoleTrust, getRelationshipByRole } from './relationships'

export function applyEffects(world: WorldState, effects: Effect[], label = '事件结果'): void {
  const user = world.players[world.playerId]
  if (!user) return

  for (const effect of effects) {
    if (effect.op === 'money') {
      const cents = Math.round(effect.delta * 100)
      if (cents !== 0) {
        world.finance.balance += cents
        world.finance.ledger.unshift({
          week: world.week,
          season: world.season,
          type: 'other',
          amount: cents,
          label,
        })
        world.finance.ledger = world.finance.ledger.slice(0, 120)
      }
      continue
    }

    const delta = clamp(effect.delta, -15, 15)
    switch (effect.op) {
      case 'morale':
        user.morale = clamp(user.morale + delta, 0, 100)
        break
      case 'fitness':
        user.fitness = clamp(user.fitness + delta, 0, 100)
        break
      case 'sharpness':
        user.sharpness = clamp(user.sharpness + delta, 0, 100)
        break
      case 'confidence':
        user.confidence = clamp(user.confidence + delta, 0, 100)
        break
      case 'coachTrust':
        adjustRelationship(getRelationshipByRole(world, 'coach'), delta)
        break
      case 'teammateTrust':
        adjustRoleTrust(world, 'teammate', delta)
        break
      case 'agentTrust':
        adjustRelationship(getRelationshipByRole(world, 'agent'), delta)
        break
      case 'familyTrust':
        adjustRelationship(getRelationshipByRole(world, 'family'), delta)
        break
      case 'mediaRep':
        user.reputation.media = clamp(user.reputation.media + delta, 0, 100)
        adjustRelationship(getRelationshipByRole(world, 'media'), delta)
        break
      case 'fanRep':
        user.reputation.fanbase = clamp(user.reputation.fanbase + delta, 0, 100)
        user.reputation.local = clamp(user.reputation.local + delta * 0.6, 0, 100)
        adjustRelationship(getRelationshipByRole(world, 'fan'), delta)
        break
    }
  }
}
