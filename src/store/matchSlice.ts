import type { WeeklyPlan, WorldState } from '../domain'
import { resolveEvent } from '../engine'
import {
  autoResolveKeyMoments,
  completeWeek,
  finalizeMatchday,
  hasPendingKeyMoments,
  resolveKeyMoment as applyKeyMomentChoice,
  startWeek,
} from '../engine'
import type { TurnResult } from '../engine'
import { messageOf, persist } from './helpers'
import type { GameStore, StoreGet, StoreSet, StoreSlice } from './types'

type MatchSlice = Pick<
  GameStore,
  'advance' | 'resolveKeyMoment' | 'skipKeyMoments' | 'resolveChoice' | 'lastTurn' | 'seasonTransition'
>

function hasUnfinishedMatchday(world: WorldState): boolean {
  return hasPendingKeyMoments(world) || world.lastMatch?.status === 'live'
}

function narrateCompletedMatch(get: StoreGet, result: TurnResult): void {
  if (!result.match) return
  void get().narrateTurn(result)
}

function settleWorld(get: StoreGet, world: WorldState): TurnResult {
  const latest = get().lastTurn
  finalizeMatchday(world)
  if (world.pendingWeekPlan) return completeWeek(world)
  return {
    world,
    match: world.lastMatch,
    event: latest?.event ?? null,
    seasonTransition: latest?.seasonTransition ?? null,
    weekPlayed: latest?.weekPlayed ?? world.week,
    seasonPlayed: latest?.seasonPlayed ?? world.season,
    live: false,
  }
}

async function finishLiveMatchday(set: StoreSet, get: StoreGet, world: WorldState): Promise<void> {
  const saveId = get().saveId
  if (!saveId) return
  const result = settleWorld(get, world)
  result.world.updatedAt = new Date().toISOString()
  set({
    world: result.world,
    lastTurn: result,
    seasonTransition: result.seasonTransition ?? get().seasonTransition,
    busy: false,
  })
  const saved = await persist(result.world, saveId)
  if (saved.ok) set({ saveId: saved.summary.id })
  else set({ error: `保存失败：${saved.error}` })
  await get().refreshSaves()
  narrateCompletedMatch(get, result)
}

async function advance(
  set: StoreSet,
  get: StoreGet,
  plan: WeeklyPlan,
): Promise<TurnResult | null> {
  const world = get().world
  if (!world || get().busy || world.retired) return null
  if (hasUnfinishedMatchday(world)) {
    set({
      error: hasPendingKeyMoments(world)
        ? '请先在比赛日完成本周的关键回合。'
        : '请先在比赛日完成本周的比赛。',
    })
    return null
  }
  set({ busy: true, error: null, notice: null })
  try {
    const result = startWeek(world, plan)
    const updated = { ...result.world, updatedAt: new Date().toISOString() }
    const adapted: TurnResult = { ...result, world: updated }
    set({
      world: updated,
      lastTurn: adapted,
      seasonTransition: result.seasonTransition,
      busy: false,
    })
    const saved = await persist(updated, get().saveId)
    if (saved.ok) set({ saveId: saved.summary.id })
    else set({ error: `保存失败：${saved.error}` })
    await get().refreshSaves()
    if (!adapted.live) narrateCompletedMatch(get, adapted)
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
  if (hasPendingKeyMoments(next)) {
    next.updatedAt = new Date().toISOString()
    set({ world: next, busy: false })
    const saved = await persist(next, saveId)
    if (saved.ok) set({ saveId: saved.summary.id })
    else set({ error: `保存失败：${saved.error}` })
    await get().refreshSaves()
    return
  }
  await finishLiveMatchday(set, get, next)
}

async function skipKeyMoments(set: StoreSet, get: StoreGet): Promise<void> {
  const world = get().world
  const saveId = get().saveId
  if (!world || !saveId || get().busy) return
  if (!hasUnfinishedMatchday(world)) return
  const next = structuredClone(world)
  autoResolveKeyMoments(next)
  set({ notice: '关键回合已按稳妥选择自动处理。' })
  await finishLiveMatchday(set, get, next)
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
  const result = await persist(next, get().saveId)
  if (result.ok) set({ saveId: result.summary.id })
  else set({ error: `保存失败：${result.error}` })
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
