import type { ChatActionProposal } from '../domain/chatAction'
import type { WorldState } from '../domain/types'
import { applyEffects } from './effects'

export function applyChatActionProposal(world: WorldState, proposal: ChatActionProposal): string {
  applyEffects(world, proposal.effects, proposal.label)
  world.aiAction = { season: world.season, week: world.week, actionId: proposal.actionId }
  return proposal.label
}
