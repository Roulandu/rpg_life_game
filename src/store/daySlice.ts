import { DAYS_PER_WEEK, TRAINING_LABELS, fixtureDayOf, weekDayRoles } from '../domain'
import type { Fixture, WeeklyPlan, WorldState } from '../domain'
import {
  advanceUntilDecision,
  getUserFixtureOnDay,
  hasPendingKeyMoments,
  opponentOf,
  startDay,
} from '../engine'
import type { DayResult, FastForwardResult, TurnResult } from '../engine'
import { WEEKDAY_LABELS, formatDateShort } from '../lib'
import { messageOf, persist } from './helpers'
import { IDLE_PLAYBACK, playbackFor } from './livePlayback'
import type { GameStore, StoreGet, StoreSet, StoreSlice } from './types'

type DaySlice = Pick<GameStore, 'advanceDay' | 'advanceToNextEvent' | 'setWeekPlan'>

/** 快进最多跨一周再多给两天：超过这个上限说明引擎卡住了，宁可停下也不能空转。 */
const MAX_FAST_FORWARD_DAYS = 9

function hasUnfinishedMatch(world: WorldState): boolean {
  return hasPendingKeyMoments(world) || world.lastMatch?.status === 'live'
}

function toTurn(world: WorldState, weekPlayed: number, day: DayResult): TurnResult {
  return {
    world,
    match: day.match,
    event: day.event,
    seasonTransition: day.seasonTransition,
    weekPlayed,
    seasonPlayed: world.season,
    live: day.live,
  }
}

function upcomingFixture(world: WorldState): Fixture | undefined {
  for (let day = world.day; day <= DAYS_PER_WEEK; day += 1) {
    const fixture = getUserFixtureOnDay(world, day)
    if (fixture) return fixture
  }
  return undefined
}

function matchPreview(world: WorldState): string {
  const fixture = upcomingFixture(world)
  const opponent = fixture ? opponentOf(world, fixture) : undefined
  if (!fixture || !opponent) return '本周没有比赛'
  const day = fixtureDayOf(fixture)
  return `${WEEKDAY_LABELS[day - 1]} ${formatDateShort(world.season, world.week, day)} 有比赛 vs ${opponent.nameZh}`
}

function fastForwardNotice(world: WorldState, fast: FastForwardResult): string {
  return `推进 ${fast.days.length} 天 · ${fast.quietDays} 个平静日 · ${matchPreview(world)}`
}

/** 停下来时告诉玩家这一天做了什么，避免快进看起来像凭空跳过了几天。 */
function daySummary(world: WorldState): string {
  const roles = weekDayRoles(Object.values(world.fixtures), world.season, world.week, world.clubId)
  const label = WEEKDAY_LABELS[world.day - 1]
  if (getUserFixtureOnDay(world, world.day)) return `${label} · 比赛日`
  if (roles.extraDay === world.day) return `${label} · 活动日`
  if (roles.trainingDays.includes(world.day)) return `${label} · 训练日：${TRAINING_LABELS[world.weekPlan.training]}`
  return `${label} · 休息日`
}

async function commitDay(
  set: StoreSet,
  get: StoreGet,
  day: DayResult,
  weekPlayed: number,
  notice: string | null,
): Promise<DayResult> {
  const world = { ...day.world, updatedAt: new Date().toISOString() }
  const result = toTurn(world, weekPlayed, day)
  set({
    world,
    lastTurn: result,
    seasonTransition: day.seasonTransition ?? get().seasonTransition,
    busy: false,
    notice,
    livePlayback: day.live ? playbackFor(world) : IDLE_PLAYBACK,
  })
  const saved = await persist(world, get().saveId)
  if (saved.ok) set({ saveId: saved.summary.id })
  else set({ error: `保存失败：${saved.error}` })
  await get().refreshSaves()
  if (!day.live && world.week !== weekPlayed) void get().narrateTurn(result)
  return day
}

/** 两种推进共用同一道护栏：先挡住未完成比赛与忙态，再把正文包进同一条错误通道。 */
async function guardedRun<R>(
  set: StoreSet,
  get: StoreGet,
  body: (world: WorldState, weekPlayed: number) => Promise<R>,
): Promise<R | null> {
  const world = get().world
  if (!world || get().busy || world.retired) return null
  if (hasUnfinishedMatch(world)) {
    set({ error: '请先完成今天的比赛。' })
    return null
  }
  set({ busy: true, error: null, notice: null })
  try {
    return await body(world, world.week)
  } catch (error) {
    set({ busy: false, error: `推进失败：${messageOf(error)}` })
    return null
  }
}

async function advanceDay(set: StoreSet, get: StoreGet): Promise<DayResult | null> {
  return guardedRun(set, get, async (world, weekPlayed) =>
    commitDay(set, get, startDay(world), weekPlayed, daySummary(world)),
  )
}

async function advanceToNextEvent(set: StoreSet, get: StoreGet): Promise<FastForwardResult | null> {
  return guardedRun(set, get, async (world, weekPlayed) => {
    const fast = advanceUntilDecision(world, MAX_FAST_FORWARD_DAYS)
    const last = fast.days.at(-1)
    if (!last) {
      set({ busy: false })
      return null
    }
    await commitDay(set, get, last, weekPlayed, fastForwardNotice(last.world, fast))
    return fast
  })
}

async function setWeekPlan(set: StoreSet, get: StoreGet, plan: WeeklyPlan): Promise<boolean> {
  const world = get().world
  if (!world || world.retired) return false
  const next = { ...world, weekPlan: plan, updatedAt: new Date().toISOString() }
  set({ world: next })
  const saved = await persist(next, get().saveId)
  if (saved.ok) set({ saveId: saved.summary.id })
  else set({ error: `保存失败：${saved.error}` })
  await get().refreshSaves()
  return saved.ok
}

export const createDaySlice: StoreSlice<DaySlice> = (set, get) => ({
  advanceDay: () => advanceDay(set, get),
  advanceToNextEvent: () => advanceToNextEvent(set, get),
  setWeekPlan: (plan) => setWeekPlan(set, get, plan),
})
