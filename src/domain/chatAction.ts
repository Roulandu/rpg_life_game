import type { Effect } from './types'

export interface ChatActionProposal {
  actionId: string
  label: string
  effects: Effect[]
}
