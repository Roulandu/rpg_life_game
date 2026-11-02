import { DAYS_PER_WEEK, absoluteDay, computeClubStrength, weekDayRoles } from '../domain'
import type { Fixture, GameEvent, MatchReport, WeekDayRoles, WorldState } from '../domain'
import { expireEvents, generateDailyEvents } from './eventsDaily'
import { updatePlayerValue } from './finance'
import { accrueDailyFinance, postWeeklyLedger } from './financeDaily'
import { autoResolveKeyMoments, finalizeMatchday, hasPendingKeyMoments } from './keyMoments'
import { startUserMatch } from './liveMatch'
import { getUserFixtureOnDay, simulateDayFixtures } from './match'
import { endSeason } from './season'
import type { SeasonTransition } from './season'
import { applySpecialization } from './specialization'
import { advanceInjuries, applyDailyAction, applyDailyTraining } from './training'

export type DayStopReason = 'matchday' | 'event' | 'milestone'

export interface DayResult {
  world: WorldState
  dayPlayed: number
  live: boolean
  quiet: boolean
  stopReason: DayStopReason | null
  match: MatchReport | null
  event: GameEvent | null
  seasonTransition: SeasonTransition | null
}

export interface FastForwardResult {
  days: DayResult[]
  stopReason: DayStopReason | null
  quietDays: number
}

interface DayOutcome {
  match: MatchReport | null
  event: GameEvent | null
  seasonTransition: SeasonTransition | null
  stopReason: DayStopReason | null
  live: boolean
}

/** 身价评估仍按三周一拍：绝对日序是 21 的倍数正好落在第 3 周的周日，与旧周结算同序。 */
const VALUE_REFRESH_DAYS = 21

function outcome(patch: Partial<DayOutcome> = {}): DayOutcome {
  return { match: null, event: null, seasonTransition: null, stopReason: null, live: false, ...patch }
}

function dayResult(world: WorldState, dayPlayed: number, result: DayOutcome): DayResult {
  return {
    world,
    dayPlayed,
    live: result.live,
    quiet: result.stopReason === null,
    stopReason: result.stopReason,
    match: result.match,
    event: result.event,
    seasonTransition: result.seasonTransition,
  }
}

/** 比赛把时钟钉在开球那一天：只要还有未处理的回合或比分还在走，当日步骤一步都不能重跑。 */
export function isPendingDay(world: WorldState): boolean {
  return Boolean(world.pendingDayPlan) || world.lastMatch?.status === 'live' || hasPendingKeyMoments(world)
}

/** 停在开球：写入 pendingDayPlan 并冻结时钟，等玩家或快进逻辑把这一天踢完。 */
function kickoff(world: WorldState, fixture: Fixture): DayOutcome {
  const report = startUserMatch(world, fixture)
  if (report.status === 'live' && hasPendingKeyMoments(world)) {
    world.pendingDayPlan = { ...world.weekPlan, fixtureId: fixture.id }
    return outcome({ match: report, live: true, stopReason: 'matchday' })
  }
  return outcome({ match: finalizeMatchday(world) })
}

function runMorning(world: WorldState, roles: WeekDayRoles): DayStopReason | null {
  if (world.day === 1) {
    const club = world.clubs[world.clubId]
    if (club) club.strength = computeClubStrength(club, world.players)
  }
  const healed = advanceInjuries(world)
  accrueDailyFinance(world)
  const plan = world.weekPlan
  if (roles.trainingDays.includes(world.day)) applyDailyTraining(world, plan.training)
  if (roles.extraDay === world.day) applyDailyAction(world, plan.extra)
  if (roles.specializationDay === world.day) applySpecialization(world)
  expireEvents(world)
  return healed ? 'milestone' : null
}

function weekMatch(world: WorldState, match: MatchReport | null): MatchReport | null {
  if (match) return match
  return world.lastMatch?.week === world.week && world.lastMatch.status === 'final' ? world.lastMatch : null
}

function advanceClock(world: WorldState): SeasonTransition | null {
  if (world.day < DAYS_PER_WEEK) {
    world.day += 1
    return null
  }
  world.day = 1
  world.week += 1
  return world.week > world.totalWeeks ? endSeason(world) : null
}

function closeDay(world: WorldState, match: MatchReport | null, stopReason: DayStopReason | null): DayResult {
  const dayPlayed = world.day
  const dayReport = simulateDayFixtures(world)
  const weeklyMatch = weekMatch(world, match)
  if (world.day === DAYS_PER_WEEK) postWeeklyLedger(world)
  // 每日事件看的是「今天这场」，不是本周任意一场：赛后事件必须落在赛后当天。
  const created = generateDailyEvents(world, dayReport ?? match)
  const event = created[0] ?? null
  if (!stopReason && created.some((item) => item.blocking)) stopReason = 'event'
  if (absoluteDay(world.week, world.day) % VALUE_REFRESH_DAYS === 0) updatePlayerValue(world)
  const seasonTransition = advanceClock(world)
  world.pendingDayPlan = null
  return dayResult(world, dayPlayed, outcome({ match: weeklyMatch, event, seasonTransition, stopReason }))
}

/**
 * 就地结算一天：调用方必须已经持有一份可以随意改写的 WorldState。
 * 周适配器靠它把一周七天走在同一次克隆上，否则每天一次 structuredClone 会让整季推进慢一个量级。
 */
export function playDay(world: WorldState, options: { autoResolve: boolean }): DayResult {
  const dayPlayed = world.day
  if (world.retired) return dayResult(world, dayPlayed, outcome())
  if (isPendingDay(world)) {
    if (!options.autoResolve) {
      return dayResult(world, dayPlayed, outcome({ match: world.lastMatch, live: true, stopReason: 'matchday' }))
    }
    autoResolveKeyMoments(world)
    return closeDay(world, finalizeMatchday(world), null)
  }

  const roles = weekDayRoles(Object.values(world.fixtures), world.season, world.week, world.clubId)
  const milestone = runMorning(world, roles)
  const fixture = getUserFixtureOnDay(world)
  const matchday = fixture ? kickoff(world, fixture) : outcome()
  if (matchday.live) {
    if (!options.autoResolve) return dayResult(world, dayPlayed, matchday)
    autoResolveKeyMoments(world)
    return closeDay(world, finalizeMatchday(world), null)
  }
  return closeDay(world, matchday.match, milestone)
}

export function startDay(input: WorldState): DayResult {
  return playDay(structuredClone(input), { autoResolve: false })
}

/** 与 startDay 同一条日步进，但把停住的比赛自动踢完：晨间步骤不会重跑，因为时钟还没走过这一天。 */
export function advanceDay(input: WorldState): DayResult {
  return playDay(structuredClone(input), { autoResolve: true })
}

export function advanceUntilDecision(input: WorldState, limit: number): FastForwardResult {
  const world = structuredClone(input)
  const days: DayResult[] = []
  let quietDays = 0
  for (let index = 0; index < limit; index += 1) {
    if (world.retired) break
    const result = playDay(world, { autoResolve: false })
    days.push(result)
    if (!result.quiet) return { days, stopReason: result.stopReason, quietDays }
    quietDays += 1
    if (result.seasonTransition) break
  }
  return { days, stopReason: days.at(-1)?.stopReason ?? null, quietDays }
}
