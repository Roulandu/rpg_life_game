import type { GameEvent, MatchReport, WeeklyPlan, WorldState } from '../domain/types'
import { createRng } from '../lib/rng'
import {
  renderEventDraft,
  resultTextFor,
  type EventDraft,
  type EventDraftContext,
} from './data/eventTemplates'
import { applyEffects } from './effects'
import { getRelationshipByRole } from './relationships'

function firstTeammateName(world: WorldState): string {
  return Object.values(world.relationships).find((relationship) => relationship.role === 'teammate')?.name ?? '队友'
}

function buildDraftContext(world: WorldState, match: MatchReport | null, plan: WeeklyPlan): EventDraftContext {
  const user = world.players[world.playerId]
  const rating = match?.userRating
  return {
    coach: getRelationshipByRole(world, 'coach')?.name ?? '主教练',
    teammate: firstTeammateName(world),
    userName: user.name,
    ratingSuffix: rating != null ? `你上一场获得了 ${rating.toFixed(1)} 分。` : '',
    restSuffix: plan.extra === 'rest' ? '你已经开始认真恢复。' : '',
  }
}

function buildEventDraft(
  templateId: string,
  world: WorldState,
  match: MatchReport | null,
  plan: WeeklyPlan,
): EventDraft {
  return renderEventDraft(templateId, buildDraftContext(world, match, plan))
}

export function expireEvents(world: WorldState): void {
  for (const event of Object.values(world.events)) {
    if (event.status === 'open' && event.expiresWeek < world.week) {
      event.status = 'expired'
    }
  }
}

export function generateWeeklyEvent(
  world: WorldState,
  match: MatchReport | null,
  plan: WeeklyPlan,
): GameEvent | null {
  const user = world.players[world.playerId]
  if (!user) return null
  const rng = createRng(world.seed, 'event', world.season, world.week)
  if (!rng.chance(0.72)) return null

  let templateId: string
  if (user.injury) {
    const hasOpenInjuryEvent = Object.values(world.events).some(
      (event) => event.status === 'open' && event.templateId === 'injury_concern',
    )
    if (hasOpenInjuryEvent) return null
    templateId = 'injury_concern'
  } else if (match && !match.userPlayed) {
    templateId = rng.pick(['bench_frustration', 'bench_frustration', 'agent_call'])
  } else if (match && match.userRating != null && match.userRating >= 7.3) {
    templateId = rng.pick(['coach_praise', 'coach_praise', 'media_interview'])
  } else if (match && match.userRating != null && match.userRating < 6.2) {
    templateId = rng.pick(['coach_warning', 'media_criticism'])
  } else if (plan.extra === 'media') {
    templateId = rng.pick(['media_interview', 'agent_sponsor'])
  } else {
    templateId = rng.pick(['teammate_dinner', 'family_visit', 'agent_sponsor', 'lifestyle_purchase'])
  }

  const draft = buildEventDraft(templateId, world, match, plan)
  const id = `event:${world.season}:${world.week}:${draft.templateId}`
  if (world.events[id]) return world.events[id]
  const event: GameEvent = {
    id,
    templateId: draft.templateId,
    title: draft.title,
    body: draft.body,
    season: world.season,
    week: world.week,
    createdAtWeek: world.week,
    expiresWeek: world.week + 2,
    status: 'open',
    choices: draft.choices,
    source: 'template',
  }
  world.events[id] = event
  world.news.unshift({
    id: `news:event:${id}`,
    season: world.season,
    week: world.week,
    title: `新消息：${event.title}`,
    body: event.body,
    kind: 'media',
  })
  world.news = world.news.slice(0, 80)
  return event
}

export function resolveEvent(
  world: WorldState,
  eventId: string,
  choiceId: string,
): GameEvent | null {
  const event = world.events[eventId]
  if (!event || event.status !== 'open') return null
  const choice = event.choices.find((item) => item.id === choiceId)
  if (!choice) return null

  applyEffects(world, choice.effects, event.title)
  if (event.templateId === 'injury_concern' && choice.id === 'rush') {
    const injury = world.players[world.playerId]?.injury
    if (injury) injury.weeksLeft = Math.max(1, injury.weeksLeft - 1)
  }
  if (event.templateId === 'lifestyle_purchase') {
    if (choice.id === 'car') world.finance.assets.push('一辆跑车')
    if (choice.id === 'apartment') world.finance.assets.push('一套小公寓')
  }

  const resultText = `${resultTextFor(event.templateId, choice.id) ?? choice.label + '。'}`
  event.status = 'resolved'
  event.resultText = resultText
  world.news.unshift({
    id: `news:event:resolved:${event.id}`,
    season: world.season,
    week: world.week,
    title: `已处理：${event.title}`,
    body: resultText,
    kind: 'media',
  })
  world.news = world.news.slice(0, 80)
  return event
}
