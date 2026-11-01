import { DAYS_PER_WEEK, EVENT_TEMPLATES, absoluteDay, displayName } from '../domain'
import type {
  EventTemplateContent,
  GameEvent,
  MatchReport,
  WorldState,
} from '../domain'
import { dayRng } from './dayContext'
import { renderEventDraft, type EventDraftContext } from './data/eventTemplates'
import { buildEventScope, scopeMatches } from './eventCondition'
import { getRelationshipByRole } from './relationships'

/**
 * 无保证候选时的日掷骰概率。周粒度时代是 0.72，摊到七天约 0.103；
 * 因为保证型赛后/伤病事件不掷骰，这里略高于均摊值，全季总量由 eventCadence 锁死。
 */
const DAILY_BASE_CHANCE = 0.13

function firstTeammateName(world: WorldState): string {
  const relationship = Object.values(world.relationships).find((item) => item.role === 'teammate')
  return displayName(relationship) || '队友'
}

/** 模板插值口径与旧周事件一致：教练、队友、主角名与赛后评分/恢复副句。 */
export function buildDraftContext(
  world: WorldState,
  match: MatchReport | null,
): EventDraftContext {
  const user = world.players[world.playerId]
  const rating = match?.userRating
  return {
    coach: displayName(getRelationshipByRole(world, 'coach')) || '主教练',
    teammate: firstTeammateName(world),
    userName: displayName(user),
    ratingSuffix: rating != null ? `你上一场获得了 ${rating.toFixed(1)} 分。` : '',
    restSuffix: world.weekPlan.extra === 'rest' ? '你已经开始认真恢复。' : '',
  }
}

/** 冷却看的是绝对日序，跨周、跨赛季都不会把同一个模板连成刷屏。 */
function isReady(world: WorldState, template: EventTemplateContent, today: number): boolean {
  const last = world.eventMemory[template.id]
  if (last != null && today - last < template.cooldownDays) return false
  if (template.weekdays && !template.weekdays.includes(world.day)) return false
  if (template.once && Object.values(world.events).some((event) => event.templateId === template.id)) return false
  if (template.maxPerSeason == null) return true
  const used = Object.values(world.events).filter(
    (event) => event.templateId === template.id && event.season === world.season,
  ).length
  return used < template.maxPerSeason
}

function weekOfAbsoluteDay(day: number): number {
  return Math.floor((day - 1) / DAYS_PER_WEEK) + 1
}

function createEvent(
  world: WorldState,
  template: EventTemplateContent,
  match: MatchReport | null,
): GameEvent | null {
  const id = `event:${world.season}:${world.week}:${world.day}:${template.id}`
  if (world.events[id]) return null

  const draft = renderEventDraft(template.id, buildDraftContext(world, match))
  const createdAtDay = absoluteDay(world.week, world.day)
  const expiresDay = createdAtDay + template.expiresDays
  const event: GameEvent = {
    id,
    templateId: template.id,
    title: draft.title,
    body: draft.body,
    sender: template.sender,
    season: world.season,
    week: world.week,
    day: world.day,
    createdAtWeek: world.week,
    createdAtDay,
    expiresWeek: weekOfAbsoluteDay(expiresDay),
    expiresDay,
    blocking: template.blocking,
    status: 'open',
    choices: draft.choices,
    source: 'template',
  }
  world.events[id] = event
  world.eventMemory[template.id] = createdAtDay
  world.news.unshift({
    id: `news:event:${id}`,
    season: world.season,
    week: world.week,
    day: world.day,
    title: `新消息：${event.title}`,
    body: event.body,
    kind: 'media',
  })
  world.news = world.news.slice(0, 80)
  return event
}

/**
 * 每天最多一条：保证型候选（赛后、伤病）先看，命中就不掷骰，
 * 这样「踢完那一场」的生活一定落在比赛当天，而不是下周日的周报里。
 */
export function generateDailyEvents(
  world: WorldState,
  match: MatchReport | null,
): GameEvent[] {
  const today = absoluteDay(world.week, world.day)
  if (Object.values(world.events).some((event) => event.createdAtDay === today)) return []

  const scope = buildEventScope(world, match)
  const ready = EVENT_TEMPLATES.filter(
    (template) => isReady(world, template, today) && scopeMatches(scope, template.when),
  )
  if (ready.length === 0) return []

  const forced = ready.filter((template) => template.guaranteed)
  const rng = dayRng(world, 'event')
  if (forced.length === 0 && !rng.chance(DAILY_BASE_CHANCE)) return []

  const pool = forced.length > 0 ? forced : ready
  const template = rng.weighted(pool.map((item) => ({ value: item, weight: item.weight })))
  const created = createEvent(world, template, match)
  return created ? [created] : []
}

/** 过期按天判定：只认 expiresDay，旧存档缺字段时回落到「那一周结束时过期」。 */
export function expireEvents(world: WorldState): void {
  const today = absoluteDay(world.week, world.day)
  for (const event of Object.values(world.events)) {
    if (event.status !== 'open') continue
    const expiresDay = event.expiresDay ?? absoluteDay(event.expiresWeek, DAYS_PER_WEEK)
    if (expiresDay < today) event.status = 'expired'
  }
}
