import { EVENT_SCOPE_FIELDS, absoluteDay, fixtureDayOf, positionGroup, round2 } from '../domain'
import type { EventCondition, EventScope, MatchReport, Player, RelationshipRole, WorldState } from '../domain'
import { getRelationshipByRole } from './relationships'

const NEVER_PLAYED = 900
/** 最近一场的时间跨度：超过这个天数就不算「上一场」，避免赛季初沿用季前赛数据。 */
const RECENT_MATCH_DAYS = 2

const SCOPE_SET = new Set<string>(EVENT_SCOPE_FIELDS)

function trustOf(world: WorldState, role: RelationshipRole): number {
  return getRelationshipByRole(world, role)?.trust ?? 50
}

function count(value: number | undefined): number {
  return value ?? 0
}

/**
 * 距上一场几天：靠赛程表反查比赛那天，因为战报本身不存日期。
 * 跨赛季的战报不参与计算，否则会算出巨大的负数。
 */
function daysSinceLastMatch(world: WorldState): number {
  const report = world.lastMatch
  const fixture = report ? world.fixtures[report.fixtureId] : undefined
  if (!report || !fixture || fixture.season !== world.season) return NEVER_PLAYED
  return Math.max(0, absoluteDay(world.week, world.day) - absoluteDay(fixture.week, fixtureDayOf(fixture)))
}

/** 身体状态：队医与体能类条件的来源。 */
function bodyPart(user: Player): Pick<EventScope, 'injuryDaysLeft' | 'morale' | 'fitness' | 'sharpness' | 'confidence'> {
  return {
    injuryDaysLeft: count(user.injury?.daysLeft),
    morale: count(user.morale),
    fitness: count(user.fitness),
    sharpness: count(user.sharpness),
    confidence: count(user.confidence),
  }
}

/** 身份与名气：青训/主力、位置组、媒体与球迷口碑。 */
function identityPart(user: Player): Pick<EventScope, 'age' | 'positionGroup' | 'squadRole' | 'mediaRep' | 'fanRep'> {
  return {
    age: count(user.age),
    positionGroup: positionGroup(user.position),
    squadRole: user.squadRole ?? 'youth',
    mediaRep: count(user.reputation.media),
    fanRep: count(user.reputation.fanbase),
  }
}

/** 人际关系与钱包：条件最常问的两类外部状态。 */
function surroundingsPart(world: WorldState): Pick<
  EventScope,
  'balance' | 'weeklyWage' | 'coachTrust' | 'teammateTrust' | 'agentTrust' | 'familyTrust' | 'clubTier'
> {
  const club = world.clubs[world.clubId]
  return {
    balance: world.finance.balance,
    weeklyWage: world.finance.weeklyWage,
    coachTrust: trustOf(world, 'coach'),
    teammateTrust: trustOf(world, 'teammate'),
    agentTrust: trustOf(world, 'agent'),
    familyTrust: trustOf(world, 'family'),
    clubTier: count(club?.tier),
  }
}

/** 只读投影：事件内容包能看到的世界切片，构建一次给当天所有条件复用。 */
export function buildEventScope(world: WorldState, match: MatchReport | null): EventScope {
  const daysSinceMatch = match ? 0 : daysSinceLastMatch(world)
  const recent = match ?? (daysSinceMatch <= RECENT_MATCH_DAYS ? world.lastMatch : null)
  const user = world.players[world.playerId]
  return {
    absoluteDay: absoluteDay(world.week, world.day),
    weekday: world.day,
    isMatchDay: Boolean(match),
    isDayAfterMatch: daysSinceMatch === 1,
    daysSinceMatch,
    lastRating: recent?.userRating ?? null,
    lastPlayed: recent?.userPlayed ? 1 : 0,
    seasonProgress: round2(world.week / world.totalWeeks),
    trainingFocus: world.weekPlan.training,
    extraAction: world.weekPlan.extra,
    ...bodyPart(user),
    ...identityPart(user),
    ...surroundingsPart(world),
  }
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

function compareNumbers(actual: unknown, expected: unknown, op: EventCondition['op']): boolean {
  const left = asNumber(actual)
  if (left === null) return false
  if (op === 'between') {
    if (!Array.isArray(expected) || expected.length !== 2) return false
    const low = asNumber(expected[0])
    const high = asNumber(expected[1])
    return low !== null && high !== null && left >= low && left <= high
  }
  const right = asNumber(expected)
  if (right === null) return false
  if (op === 'lt') return left < right
  if (op === 'lte') return left <= right
  return left >= right
}

function matchesOne(scope: EventScope, condition: EventCondition): boolean {
  if (!SCOPE_SET.has(condition.field)) {
    throw new Error(`事件条件字段不在白名单：${condition.field}`)
  }
  const actual = (scope as unknown as Record<string, unknown>)[condition.field]
  switch (condition.op) {
    case 'eq':
      return actual === condition.value
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(actual)
    default:
      return compareNumbers(actual, condition.value, condition.op)
  }
}

/** 条件之间是合取：任何一条不成立，这个模板今天就不该出现。 */
export function scopeMatches(scope: EventScope, conditions: readonly EventCondition[]): boolean {
  return conditions.every((condition) => matchesOne(scope, condition))
}
