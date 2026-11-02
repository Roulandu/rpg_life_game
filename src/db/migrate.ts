import {
  DAYS_PER_WEEK,
  DEFAULT_WEEK_PLAN,
  absoluteDay,
  buildMatchLineups,
  dayForRound,
  emptyAttrInvestment,
  eventTemplateById,
  fixtureDayOf,
  nameZhFor,
} from '../domain'
import type {
  GameEvent,
  KeyMoment,
  MatchReport,
  MatchStatLine,
  MatchStats,
  Player,
  Relationship,
  WorldState,
} from '../domain'
import { CURRENT_SAVE_VERSION, assertWorld } from '../domain/schema/save.schema'

type LegacyReport = MatchReport & {
  status?: MatchReport['status']
  currentMinute?: number
  goals?: MatchReport['goals']
}

/** v5 之前没有中文名：这些字段在 v6 里补齐，迁移前可能整体缺失。 */
type LegacyNamed = { name: string; nameZh?: string }
type LegacyPlayer = Player & LegacyNamed
type LegacyRelationship = Relationship & LegacyNamed
type LegacyLineupEntry = { id?: string; name: string; nameZh?: string }

/** v4 只有周时钟：这些字段在 v5 里被日时钟取代，迁移后必须消失。 */
type LegacyWeekClock = WorldState & {
  day?: number
  weekPlan?: WorldState['weekPlan']
  pendingWeekPlan?: WorldState['pendingDayPlan']
  pendingDayPlan?: WorldState['pendingDayPlan']
}

type LegacyInjury = { kind: string; severity: number; weeksLeft?: number; daysLeft?: number }

/** v6 事件只有周字段：日序与拦截性由 v7 迁移补齐。 */
type LegacyEvent = GameEvent & {
  day?: number
  createdAtDay?: number
  expiresDay?: number
  blocking?: boolean
  sender?: string
}

function normalizeReport(report: MatchReport): MatchReport {
  const legacy = report as LegacyReport
  if (legacy.status && legacy.currentMinute != null && Array.isArray(legacy.goals)) {
    return report
  }
  return {
    ...legacy,
    status: legacy.status ?? 'final',
    currentMinute: legacy.currentMinute ?? 90,
    goals: legacy.goals ?? [],
  }
}

function statLine(possession: number, goals: number): MatchStatLine {
  return { possession, shots: goals, shotsOnTarget: goals, corners: 0 }
}

function backfillStats(report: MatchReport): MatchStats {
  const minutes = Math.max(0, Math.min(90, report.currentMinute))
  const homePossession = Math.round(minutes / 2)
  return {
    home: statLine(homePossession, report.homeGoals),
    away: statLine(minutes - homePossession, report.awayGoals),
  }
}

function upgradeLiveReport(world: WorldState, report: MatchReport): MatchReport {
  if (report.status !== 'live') return report
  const upgraded: MatchReport = {
    ...report,
    stats: report.stats ?? backfillStats(report),
    lineups: report.lineups ?? buildMatchLineups(world, report),
  }
  if (upgraded.liveState) return upgraded
  return { ...upgraded, liveState: { possession: 'home', ballX: 0.5 } }
}

/**
 * v4→v5：周时钟换成日时钟。停着的 live 比赛要把时钟摆回它所在的那一天，
 * 否则读档后那天永远等不到开球，未踢完的关键回合就废了。
 */
function migrateFixtureDays(world: WorldState): void {
  for (const fixture of Object.values(world.fixtures)) {
    fixture.day = fixture.day ?? dayForRound(fixture.round)
  }
}

function migrateInjuryDays(world: WorldState): void {
  for (const player of Object.values(world.players)) {
    const injury = player.injury as LegacyInjury | null
    if (!injury || injury.daysLeft != null || injury.weeksLeft == null) continue
    injury.daysLeft = Math.max(1, Math.round(injury.weeksLeft * 7))
    delete injury.weeksLeft
  }
}

function migrateTimeModel(world: WorldState): void {
  const legacy = world as LegacyWeekClock
  migrateFixtureDays(world)
  migrateInjuryDays(world)
  const pending = legacy.pendingWeekPlan ?? legacy.pendingDayPlan ?? null
  delete legacy.pendingWeekPlan
  legacy.pendingDayPlan = pending
  legacy.weekPlan = legacy.weekPlan ?? DEFAULT_WEEK_PLAN
  const liveFixture =
    world.lastMatch?.status === 'live' ? world.fixtures[world.lastMatch.fixtureId] : undefined
  legacy.day = liveFixture ? fixtureDayOf(liveFixture) : 1
}

/**
 * v5→v6：补中文名。实体字段按原名转写，历史文本（战报、新闻、事件、关系摘要）按
 * 「原名 → 中文名」映射整词替换，避免旧存档里残留拉丁人名。
 */
function localizeText(value: string, aliases: Array<[string, string]>): string {
  let text = value
  for (const [original, localized] of aliases) {
    if (original === localized) continue
    text = text.replace(
      new RegExp(`(?<![A-Za-z])${original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z])`, 'g'),
      localized,
    )
  }
  return text
}

interface Localizer {
  aliases: Array<[string, string]>
  byName: Map<string, string>
  players: Record<string, Player>
}

function localizeEntities(world: WorldState): Localizer {
  for (const player of Object.values(world.players) as LegacyPlayer[]) {
    player.nameZh = player.nameZh || nameZhFor(player.name, player.nationality)
  }
  for (const club of Object.values(world.clubs)) {
    const coach = club.coach as LegacyNamed
    coach.nameZh = coach.nameZh || nameZhFor(coach.name, '英格兰')
  }
  const aliases: Array<[string, string]> = [
    ...(Object.values(world.players) as LegacyPlayer[]).map(
      (player) => [player.name, player.nameZh] as [string, string],
    ),
    ...Object.values(world.clubs).map((club) => [club.coach.name, club.coach.nameZh] as [string, string]),
  ]
  return { aliases, byName: new Map(aliases), players: world.players }
}

function localizeLineup(lineup: LegacyLineupEntry[] | undefined, localizer: Localizer): void {
  for (const entry of lineup ?? []) {
    entry.nameZh = entry.nameZh ?? localizer.players[entry.id ?? '']?.nameZh ?? entry.name
  }
}

function localizeKeyMoment(moment: KeyMoment, aliases: Array<[string, string]>): void {
  moment.titleZh = localizeText(moment.titleZh, aliases)
  moment.promptZh = localizeText(moment.promptZh, aliases)
  if (moment.triggerZh) moment.triggerZh = localizeText(moment.triggerZh, aliases)
  if (moment.outcome) moment.outcome.textZh = localizeText(moment.outcome.textZh, aliases)
}

function localizeReport(report: MatchReport, localizer: Localizer): void {
  const { aliases, byName } = localizer
  for (const goal of report.goals) {
    goal.scorerName = byName.get(goal.scorerName) ?? goal.scorerName
    if (goal.assistName) goal.assistName = byName.get(goal.assistName) ?? goal.assistName
  }
  report.motmName = byName.get(report.motmName) ?? report.motmName
  if (report.mediaReaction) report.mediaReaction = localizeText(report.mediaReaction, aliases)
  for (const line of report.events) line.text = localizeText(line.text, aliases)
  for (const moment of report.keyMoments ?? []) localizeKeyMoment(moment, aliases)
  localizeLineup(report.lineups?.home, localizer)
  localizeLineup(report.lineups?.away, localizer)
}

function migrateNames(world: WorldState): void {
  const localizer = localizeEntities(world)
  const { aliases } = localizer
  for (const relationship of Object.values(world.relationships) as LegacyRelationship[]) {
    relationship.nameZh = relationship.nameZh || nameZhFor(relationship.name, '英格兰')
    relationship.summary = localizeText(relationship.summary, aliases)
  }

  const reports = [
    world.lastMatch,
    ...Object.values(world.fixtures).map((fixture) => fixture.report),
  ].filter((report): report is MatchReport => Boolean(report))
  for (const report of reports) localizeReport(report, localizer)

  for (const item of world.news) {
    item.title = localizeText(item.title, aliases)
    item.body = localizeText(item.body, aliases)
  }
  for (const event of Object.values(world.events)) {
    event.title = localizeText(event.title, aliases)
    event.body = localizeText(event.body, aliases)
    if (event.resultText) event.resultText = localizeText(event.resultText, aliases)
    for (const choice of event.choices) choice.label = localizeText(choice.label, aliases)
  }
}

/**
 * v6→v7：事件从「每周一条」改成「每天最多一条」。
 * 老事件按周换算出日序，冷却表用事件本身重建，否则旧档读进来第一周就会被同一模板刷屏。
 */
function migrateEventDays(world: WorldState): void {
  const memory: Record<string, number> = {}
  for (const event of Object.values(world.events) as LegacyEvent[]) {
    const template = eventTemplateById(event.templateId)
    event.day ??= DAYS_PER_WEEK
    event.createdAtDay ??= absoluteDay(event.createdAtWeek, event.day)
    event.expiresDay ??= absoluteDay(event.expiresWeek, DAYS_PER_WEEK)
    event.blocking ??= template?.blocking ?? true
    event.sender ??= template?.sender ?? '俱乐部'
    memory[event.templateId] = Math.max(memory[event.templateId] ?? 0, event.createdAtDay)
  }
  world.eventMemory = memory
}

/** v7 及更早的存档没有成长账本，三个字段整体缺失。 */
type LegacyGrowthPlayer = { exp?: number; lifetimeExp?: number; attrInvestment?: Player['attrInvestment'] }

/**
 * v7→v8：经验与属性投资登场。
 * 老档一律从零起步：已有值保持不变（脏档只抹一半时不能把玩家攒的经验清掉），
 * `attrInvestment` 补成十字段全 0，好让投资曲线的第一点价格稳定在 6。
 */
function migrateGrowth(world: WorldState): void {
  for (const player of Object.values(world.players) as LegacyGrowthPlayer[]) {
    player.exp ??= 0
    player.lifetimeExp ??= 0
    player.attrInvestment ??= emptyAttrInvestment()
  }
}

/**
 * v8 还没有绝技层：球员的 `moves` 与周计划的 `specialization` 槽整体缺失。
 * 补成「一条不会 + 本周不练」，让持有判断只有一条取值路径。
 */
function migrateMoves(world: WorldState): void {
  for (const player of Object.values(world.players)) player.moves ??= []
  world.weekPlan.specialization ??= null
}

export function migrateWorld(input: WorldState): WorldState {
  if (input.version > CURRENT_SAVE_VERSION) {
    throw new Error('这个存档来自更新版本的游戏，请先更新。')
  }
  if (input.version >= CURRENT_SAVE_VERSION) return input

  const sourceVersion = input.version
  const world = structuredClone(input)
  const reports = new Map<MatchReport, MatchReport>()
  const migrateReport = (report: MatchReport): MatchReport => {
    const existing = reports.get(report)
    if (existing) return existing
    const migrated = upgradeLiveReport(world, normalizeReport(report))
    reports.set(report, migrated)
    return migrated
  }

  for (const fixture of Object.values(world.fixtures)) {
    if (fixture.report) fixture.report = migrateReport(fixture.report)
  }
  if (world.lastMatch) world.lastMatch = migrateReport(world.lastMatch)

  if (sourceVersion < 5) migrateTimeModel(world)
  if (sourceVersion < 6) migrateNames(world)
  if (sourceVersion < 7) migrateEventDays(world)
  if (sourceVersion < 8) migrateGrowth(world)
  if (sourceVersion < 9) migrateMoves(world)
  if (sourceVersion < 2) world.pendingDayPlan = null
  world.version = CURRENT_SAVE_VERSION
  return assertWorld(world)
}
