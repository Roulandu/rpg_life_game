import type { ChatActionProposal } from '../domain/chatAction'
import type { Effect, WorldState } from '../domain/types'

export type ChatActionId = 'none' | 'talk_coach' | 'rest' | 'extra_training' | 'media_interview'

interface ChatAction {
  label: string
  effects: Effect[]
}

const CHAT_ACTIONS: Record<Exclude<ChatActionId, 'none'>, ChatAction> = {
  talk_coach: {
    label: '与教练谈话',
    effects: [
      { op: 'coachTrust', delta: 2 },
      { op: 'morale', delta: 1 },
    ],
  },
  rest: {
    label: '休息调整',
    effects: [
      { op: 'fitness', delta: 4 },
      { op: 'sharpness', delta: -1 },
    ],
  },
  extra_training: {
    label: '主动加练',
    effects: [
      { op: 'sharpness', delta: 3 },
      { op: 'fitness', delta: -4 },
      { op: 'coachTrust', delta: 1 },
    ],
  },
  media_interview: {
    label: '接受采访',
    effects: [
      { op: 'mediaRep', delta: 2 },
      { op: 'fanRep', delta: 1 },
    ],
  },
}

export function actionUsedThisWeek(world: WorldState): boolean {
  return world.aiAction?.season === world.season && world.aiAction.week === world.week
}

export function resolveChatAction(world: WorldState, actionId: ChatActionId): ChatActionProposal | null {
  if (actionId === 'none') return null
  if (actionUsedThisWeek(world)) return null

  const action = CHAT_ACTIONS[actionId]
  if (!action) return null

  return { actionId, label: action.label, effects: action.effects }
}

export function actionLabelFor(actionId: string | undefined): string | null {
  if (!actionId || actionId === 'none') return null
  return CHAT_ACTIONS[actionId as Exclude<ChatActionId, 'none'>]?.label ?? null
}
