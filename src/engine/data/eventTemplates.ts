import { eventTemplateById } from '../../domain'
import type { MatchReport, WorldState } from '../../domain'
import type { EventChoice } from '../../domain'
import { displayName } from '../../domain'
import { getRelationshipByRole } from '../relationships'

export interface EventDraftContext {
  coach: string
  teammate: string
  userName: string
  ratingSuffix: string
  restSuffix: string
}

export interface EventDraft {
  templateId: string
  title: string
  body: string
  choices: EventChoice[]
}

/** 模板插值口径与旧周事件一致：教练、队友、主角名与赛后评分/恢复副句。 */
export function buildDraftContext(
  world: WorldState,
  match: MatchReport | null,
): EventDraftContext {
  const user = world.players[world.playerId]
  const rating = match?.userRating
  const teammate = displayName(
    Object.values(world.relationships).find((item) => item.role === 'teammate'),
  ) || '队友'
  return {
    coach: displayName(getRelationshipByRole(world, 'coach')) || '主教练',
    teammate,
    userName: displayName(user),
    ratingSuffix: rating != null ? `你上一场获得了 ${rating.toFixed(1)} 分。` : '',
    restSuffix: world.weekPlan.extra === 'rest' ? '你已经开始认真恢复。' : '',
  }
}

/**
 * 数据包缺失时的兜底文案：只用于未知 templateId（例如旧存档里的自定义事件），
 * 保持简化版，不去读数据包，避免回退路径反过来依赖内容。
 */
const FALLBACK_TEMPLATE_ID = 'teammate_dinner'
const FALLBACK: { title: string; body: string; choices: EventChoice[] } = {
  title: '更衣室的邀请',
  body: '{teammate} 邀请你参加今晚的队内聚餐。',
  choices: [
    { id: 'join', label: '参加', description: '融入更衣室。', effects: [{ op: 'teammateTrust', delta: 3 }, { op: 'morale', delta: 3 }] },
    { id: 'decline', label: '婉拒，去加练', description: '把时间用在训练上。', effects: [{ op: 'teammateTrust', delta: -2 }, { op: 'sharpness', delta: 3 }] },
  ],
}

export function interpolate(text: string, ctx: EventDraftContext): string {
  const values: Record<string, string> = {
    '{coach}': ctx.coach,
    '{teammate}': ctx.teammate,
    '{userName}': ctx.userName,
    '{ratingSuffix}': ctx.ratingSuffix,
    '{restSuffix}': ctx.restSuffix,
  }
  return text.replace(/\{[a-zA-Z]+\}/g, (token) => values[token] ?? token)
}

/** 数据包是模板的唯一来源，渲染器只做插值，不再持有任何文案。 */
export function renderEventDraft(templateId: string, ctx: EventDraftContext): EventDraft {
  const template = eventTemplateById(templateId)
  if (!template) {
    return {
      templateId: FALLBACK_TEMPLATE_ID,
      title: FALLBACK.title,
      body: interpolate(FALLBACK.body, ctx),
      choices: FALLBACK.choices,
    }
  }
  return {
    templateId: template.id,
    title: template.title,
    body: interpolate(template.body, ctx),
    choices: template.choices,
  }
}

export function resultTextFor(templateId: string, choiceId: string): string | undefined {
  return eventTemplateById(templateId)?.resultTexts?.[choiceId]
}
