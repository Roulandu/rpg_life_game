import { clamp } from '../domain'
import type { Effect, Player, WorldState } from '../domain'
import { grantExp } from './growth'
import { applyMoveEffect } from './moveMentor'
import { adjustRelationship, adjustRoleTrust, getRelationshipByRole } from './relationships'

/** 现金类效果直接改余额并留一条流水，单位是便士。 */
function applyMoneyEffect(world: WorldState, effect: Effect, label: string): void {
  const cents = Math.round(effect.delta * 100)
  if (cents === 0) return
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

/** 伤停只调整已有的伤，事件不能凭空让人受伤。 */
function applyInjuryEffect(user: Player, effect: Effect): void {
  const injury = user.injury
  if (injury) injury.daysLeft = Math.max(1, injury.daysLeft + Math.round(effect.delta))
}

function applyStatusEffect(world: WorldState, user: Player, effect: Effect): void {
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
    case 'legendTrust':
      adjustRelationship(getRelationshipByRole(world, 'legend'), delta)
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

export function applyEffects(world: WorldState, effects: Effect[], label = '事件结果'): void {
  const user = world.players[world.playerId]
  if (!user) return

  for (const effect of effects) {
    if (effect.op === 'money') {
      applyMoneyEffect(world, effect, label)
      continue
    }
    if (effect.op === 'injuryDays') {
      applyInjuryEffect(user, effect)
      continue
    }
    // 经验只能经 grantExp 入账：负值事件不该把已攒的经验扣走。
    if (effect.op === 'exp') {
      grantExp(world, effect.delta, 'event')
      continue
    }
    // 绝技的授予与点拨走名宿路径自己的闸门：位置不符、门槛不够都不会写进档案。
    if (effect.op === 'learnMove' || effect.op === 'moveProgress') {
      applyMoveEffect(world, user, effect)
      continue
    }
    applyStatusEffect(world, user, effect)
  }
}
