import type { MatchReport, WeeklyPlan, WorldState } from '../domain/types'
import { resolveEvent } from '../engine/events'
import {
  autoResolveKeyMoments,
  finalizeMatchday,
  hasPendingKeyMoments,
  resolveKeyMoment as applyKeyMomentChoice,
} from '../engine/keyMoments'
import { advanceWeek, type TurnResult } from '../engine/turn'
import { messageOf, persist } from './helpers'
import type { GameStore, StoreGet, StoreSet, StoreSlice } from './types'

type MatchSlice = Pick<
  GameStore,
  'advance' | 'resolveKeyMoment' | 'skipKeyMoments' | 'resolveChoice' | 'lastTurn' | 'seasonTransition'
>

function narrateCompletedMatch(
  get: StoreGet,
  world: WorldState,
  result: MatchReport | null,
): void {
  if (!result) return
  const latest = get().lastTurn
  void get().narrateTurn({
    world,
    match: world.lastMatch ?? result,
    event: latest?.event ?? null,
    seasonTransition: latest?.seasonTransition ?? null,
    weekPlayed: result.week,
    seasonPlayed: result.season,
  })
}

async function advance(
  set: StoreSet,
  get: StoreGet,
  plan: WeeklyPlan,
): Promise<TurnResult | null> {
  const world = get().world
  if (!world || get().busy || world.retired) return null
  if (hasPendingKeyMoments(world)) {
    set({ error: '请先在比赛日完成本周的关键回合。' })
    return null
  }
  set({ busy: true, error: null, notice: null })
  try {
    const result = advanceWeek(world, plan)
    const updated = { ...result.world, updatedAt: new Date().toISOString() }
    const adapted: TurnResult = { ...result, world: updated }
    set({
      world: updated,
      lastTurn: adapted,
      seasonTransition: result.seasonTransition,
      busy: false,
    })
    const summary = await persist(updated, get().saveId)
    if (summary) set({ saveId: summary.id })
    await get().refreshSaves()
    if (!hasPendingKeyMoments(updated)) void get().narrateTurn(adapted)
    return adapted
  } catch (error) {
    set({ busy: false, error: `推进失败：${messageOf(error)}` })
    return null
  }
}

async function resolveKeyMoment(
  set: StoreSet,
  get: StoreGet,
  momentId: string,
  optionId: string,
): Promise<void> {
  const world = get().world
  const saveId = get().saveId
  if (!world || !saveId || get().busy) return
  const next = structuredClone(world)
  const report = applyKeyMomentChoice(next, momentId, optionId)
  if (!report) {
    set({ error: '这个关键回合已经结束，或选项无效。' })
    return
  }
  const stillPending = hasPendingKeyMoments(next)
  if (!stillPending) finalizeMatchday(next)
  next.updatedAt = new Date().toISOString()
  set({ world: next })
  const summary = await persist(next, saveId)
  if (summary) set({ saveId: summary.id })
  await get().refreshSaves()
  if (!stillPending) narrateCompletedMatch(get, next, report)
}

async function skipKeyMoments(set: StoreSet, get: StoreGet): Promise<void> {
  const world = get().world
  const saveId = get().saveId
  if (!world || !saveId || get().busy || !hasPendingKeyMoments(world)) return
  const next = structuredClone(world)
  const report = autoResolveKeyMoments(next)
  if (!report) return
  finalizeMatchday(next)
  next.updatedAt = new Date().toISOString()
  set({ world: next, notice: '关键回合已按稳妥选择自动处理。' })
  const summary = await persist(next, saveId)
  if (summary) set({ saveId: summary.id })
  await get().refreshSaves()
  narrateCompletedMatch(get, next, report)
}

async function resolveChoice(
  set: StoreSet,
  get: StoreGet,
  eventId: string,
  choiceId: string,
): Promise<void> {
  const world = get().world
  if (!world) return
  const next = structuredClone(world)
  const event = resolveEvent(next, eventId, choiceId)
  if (!event) {
    set({ error: '这个事件已经处理过，或选项无效。' })
    return
  }
  next.updatedAt = new Date().toISOString()
  set({ world: next, notice: `已处理：${event.title}` })
  const summary = await persist(next, get().saveId)
  if (summary) set({ saveId: summary.id })
  await get().refreshSaves()
}

export const createMatchSlice: StoreSlice<MatchSlice> = (set, get) => ({
  lastTurn: null,
  seasonTransition: null,

  advance: (plan) => advance(set, get, plan),
  resolveKeyMoment: (momentId, optionId) => resolveKeyMoment(set, get, momentId, optionId),
  skipKeyMoments: () => skipKeyMoments(set, get),
  resolveChoice: (eventId, choiceId) => resolveChoice(set, get, eventId, choiceId),
})
