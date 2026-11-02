import {
  DAYS_PER_WEEK,
  DEFAULT_WEEK_PLAN,
  absoluteDay,
  dayForRound,
  emptyAttrInvestment,
  eventTemplateById,
  fixtureDayOf,
  makeLegendRelationship,
  nameZhFor,
} from '../domain'
import type { GameEvent, KeyMoment, MatchReport, Player, Relationship, WorldState } from '../domain'

/**
 * 职责：把「某一档存档缺什么」拆成独立小步，migrateWorld 只负责按顺序跑表。
 * 边界：一步只做一件事，且只在 sourceVersion 低于 from 时执行；新增一档就往表尾加一行，不要回头改前面的步骤。
 * 依赖：只读 src/domain 的常量与转写工具，不碰引擎与计时钟。
 */
export interface MigrationStep {
  /** 低于这个版本的存档才需要跑这一步。 */
  from: number
  run: (world: WorldState) => void
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

/** v7 及更早的存档没有成长账本，三个字段整体缺失。 */
type LegacyGrowthPlayer = { exp?: number; lifetimeExp?: number; attrInvestment?: Player['attrInvestment'] }

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

/**
 * v9 还没有名宿：关系表里查不到这个人，事件包里的 learnMove / legendTrust 在老档上会静默失效。
 * 只在确实没有名宿时补一条，玩家已经刷出来的信任与文案原样保留。
 */
function migrateLegend(world: WorldState): void {
  if (Object.values(world.relationships).some((relationship) => relationship.role === 'legend')) return
  const legend = makeLegendRelationship(world.playerId)
  world.relationships[legend.id] = legend
}

/**
 * v10 的财务只会「周日一次算清」：既没有待入账，也没有投资账本。
 * 补成零待入账 + 空账本，不折现、不动余额——旧档这一周还没累计过的开销，本来就还没发生。
 */
function migrateFinance(world: WorldState): void {
  const finance = world.finance
  finance.pendingIncome ??= 0
  finance.pendingExpenses ??= 0
  finance.investments ??= []
}

/** v1 及更早的存档没有逐日计划：放在表尾，让上面几步先把时钟补出来再整体清空。 */
function clearPendingPlan(world: WorldState): void {
  world.pendingDayPlan = null
}

/** 数组顺序就是执行顺序，所以 `from` 不要求单调递增。 */
export const MIGRATION_STEPS: MigrationStep[] = [
  { from: 5, run: migrateTimeModel },
  { from: 6, run: migrateNames },
  { from: 7, run: migrateEventDays },
  { from: 8, run: migrateGrowth },
  { from: 9, run: migrateMoves },
  { from: 10, run: migrateLegend },
  { from: 11, run: migrateFinance },
  { from: 2, run: clearPendingPlan },
]
