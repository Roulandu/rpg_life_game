import { DAYS_PER_WEEK } from '../domain'
import type { GameEvent, MatchReport, WeeklyPlan, WorldState } from '../domain'
import { isPendingDay, playDay } from './day'
import type { DayResult } from './day'
import { autoResolveKeyMoments, finalizeMatchday, hasPendingKeyMoments } from './keyMoments'
import type { SeasonTransition } from './season'

export type { SeasonTransition } from './season'

export interface TurnResult {
  world: WorldState
  match: MatchReport | null
  event: GameEvent | null
  seasonTransition: SeasonTransition | null
  weekPlayed: number
  seasonPlayed: number
  live: boolean
}

interface TurnPatch {
  match?: MatchReport | null
  event?: GameEvent | null
  seasonTransition?: SeasonTransition | null
  live?: boolean
}

function turn(
  world: WorldState,
  weekPlayed: number,
  seasonPlayed: number,
  patch: TurnPatch = {},
): TurnResult {
  return {
    world,
    match: patch.match ?? null,
    event: patch.event ?? null,
    seasonTransition: patch.seasonTransition ?? null,
    weekPlayed,
    seasonPlayed,
    live: patch.live ?? false,
  }
}

function fromDay(day: DayResult, weekPlayed: number, seasonPlayed: number, match: MatchReport | null): TurnResult {
  return turn(day.world, weekPlayed, seasonPlayed, {
    match: day.match ?? match,
    event: day.event,
    seasonTransition: day.seasonTransition,
    live: day.live,
  })
}

/**
 * 把一次周推进表达成「跑到本周一件必须停下来处理的事」：
 * 平静日自动跳过，只有停在开球那一刻才返回 live。事件与里程碑不拦周推进，交给日步进。
 * 整周走在同一份克隆上，每天不再另复制一次。
 */
function runWeek(input: WorldState, autoResolve: boolean): TurnResult {
  const weekPlayed = input.week
  const seasonPlayed = input.season
  let current = input
  let match: MatchReport | null = null
  for (let index = 0; index < DAYS_PER_WEEK; index += 1) {
    const day = playDay(current, { autoResolve })
    if (day.live) return fromDay(day, weekPlayed, seasonPlayed, match)
    if (day.match) match = day.match
    current = day.world
    if (current.week !== weekPlayed || day.seasonTransition) {
      return turn(current, weekPlayed, seasonPlayed, {
        match,
        event: day.event,
        seasonTransition: day.seasonTransition,
      })
    }
  }
  return turn(current, weekPlayed, seasonPlayed, { match })
}

export function startWeek(input: WorldState, plan: WeeklyPlan): TurnResult {
  const world = structuredClone(input)
  const weekPlayed = world.week
  const seasonPlayed = world.season
  if (world.retired) return turn(world, weekPlayed, seasonPlayed)
  if (isPendingDay(world)) {
    return turn(world, weekPlayed, seasonPlayed, { match: world.lastMatch, live: true })
  }
  world.weekPlan = plan
  return runWeek(world, false)
}

/** 只在停住的那一天还有 pendingDayPlan 时结算：旧档缺少它时一步都不走，免得把周次多推一格。 */
export function completeWeek(input: WorldState): TurnResult {
  const world = structuredClone(input)
  const weekPlayed = world.week
  const seasonPlayed = world.season
  if (!world.pendingDayPlan) {
    return turn(world, weekPlayed, seasonPlayed, {
      match: world.lastMatch,
      live: world.lastMatch?.status === 'live',
    })
  }
  // 玩家还没看完关键回合时拒绝结算：这一步不能替玩家把回合自动踢掉。
  if (hasPendingKeyMoments(world)) {
    return turn(world, weekPlayed, seasonPlayed, { match: world.lastMatch, live: true })
  }
  return runWeek(world, true)
}

/** 一次推进一整周：停在开球的比赛按稳妥选择自动踢完，再走 completeWeek 的收尾。 */
export function advanceWeek(input: WorldState, plan: WeeklyPlan): TurnResult {
  const started = startWeek(input, plan)
  if (!started.live) return started

  const world = structuredClone(started.world)
  autoResolveKeyMoments(world)
  finalizeMatchday(world)
  return completeWeek(world)
}

export function advanceWeeks(world: WorldState, plan: WeeklyPlan, count: number): TurnResult[] {
  const results: TurnResult[] = []
  let current = world
  for (let i = 0; i < count; i += 1) {
    if (current.retired) break
    const result = advanceWeek(current, plan)
    results.push(result)
    current = result.world
    if (result.seasonTransition) break
  }
  return results
}
