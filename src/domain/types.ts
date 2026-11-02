import type { AttrAllocation } from './allocation'
import type { AiChatMessage, AiNarrative, AiUsage } from './aiTypes'
import type { GameEvent } from './eventContent'
import type { Fixture, MatchReport } from './matchTypes'
import type { CareerEntry, Contract, Injury, Reputation, SeasonStat } from './playerTypes'
import type {
  Archetype,
  AttrInvestment,
  Attributes,
  CareerBackground,
  ExtraAction,
  Foot,
  Id,
  PlayerMove,
  Position,
  TrainingFocus,
} from './primitiveTypes'

export type {
  Archetype,
  AttrInvestment,
  AttrKey,
  Attributes,
  CareerBackground,
  ExtraAction,
  Foot,
  Id,
  PlayerMove,
  Position,
  TrainingFocus,
} from './primitiveTypes'

export type {
  Fixture,
  FixtureStatus,
  KeyMoment,
  KeyMomentKind,
  KeyMomentOption,
  KeyMomentOutcome,
  MatchEventLine,
  MatchEventType,
  MatchGoal,
  MatchReport,
} from './matchTypes'

export type { Effect, EffectOp, EventChoice, GameEvent } from './eventContent'

export type { CareerEntry, Contract, Injury, Reputation, SeasonStat } from './playerTypes'

export interface Player {
  id: Id
  name: string
  /** 中文显示名：界面与直播一律取它；name 仍用于存档 id、合同与导出文件名。 */
  nameZh: string
  nationality: string
  birthYear: number
  age: number
  position: Position
  foot: Foot
  attributes: Attributes
  potential: number
  /** 没花掉的经验：唯一可支配的成长货币，只有引擎的 `grantExp` 能加。 */
  exp: number
  /** 累计拿到过的经验，不随花费减少，用来抬高单属性投资上限。 */
  lifetimeExp: number
  /** 各属性已投点数，决定下一点的价格。 */
  attrInvestment: AttrInvestment
  /** 已学会的绝技。缺字段按「一条不会」处理，v9 迁移会把老档补成空数组。 */
  moves?: PlayerMove[]
  form: number
  fitness: number
  sharpness: number
  morale: number
  confidence: number
  clubId: Id
  squadRole: 'youth' | 'rotation' | 'starter' | 'star'
  contract: Contract
  value: number
  reputation: Reputation
  traits: string[]
  injury: Injury | null
  seasonStats: SeasonStat
  careerStats: SeasonStat[]
  history: CareerEntry[]
  isUser: boolean
}

export interface ClubStrength {
  attack: number
  midfield: number
  defense: number
  overall: number
}

export interface Coach {
  id: Id
  name: string
  nameZh: string
  age: number
  style: string
  quality: number
}

export interface Club {
  id: Id
  nameZh: string
  nameEn: string
  city: string
  countryCode: string
  leagueId: Id
  tier: number
  reputation: number
  budget: number
  wageBudget: number
  facilities: number
  style: 'possession' | 'counter' | 'highPress' | 'direct'
  colors: { primary: string; secondary: string }
  stadium: string
  squadIds: Id[]
  coach: Coach
  strength: ClubStrength
}

export interface League {
  id: Id
  nameZh: string
  countryCode: string
  tier: number
  clubIds: Id[]
  promotionSlots: number
  relegationSlots: number
  reputation: number
}

export interface LeagueTableRow {
  clubId: Id
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  points: number
  form: ('W' | 'D' | 'L')[]
}

export type RelationshipRole =
  | 'coach'
  | 'teammate'
  | 'agent'
  | 'family'
  | 'media'
  | 'fan'
  | 'legend'

export interface Relationship {
  id: Id
  name: string
  nameZh: string
  role: RelationshipRole
  trust: number
  tension: number
  summary: string
  lastInteractionWeek?: number
}

export interface FinanceLedgerEntry {
  week: number
  season: number
  type: 'wage' | 'bonus' | 'expense' | 'sponsor' | 'transfer' | 'purchase' | 'other'
  amount: number
  label: string
}

export interface Finance {
  balance: number
  weeklyWage: number
  weeklyExpenses: number
  ledger: FinanceLedgerEntry[]
  assets: string[]
  sponsorships: { name: string; weekly: number; endSeason: number }[]
}

export interface SeasonSummary {
  season: number
  clubId: Id
  clubName: string
  tier: number
  leaguePosition: number
  appearances: number
  goals: number
  assists: number
  averageRating: number
  awards: string[]
  note?: string
}

export interface NewsItem {
  id: Id
  season: number
  week: number
  day?: number
  title: string
  body: string
  kind: 'match' | 'transfer' | 'media' | 'club' | 'award' | 'system'
}

export interface WorldState {
  version: number
  seed: number
  engineVersion: string
  createdAt: string
  updatedAt: string
  playerId: Id
  clubId: Id
  players: Record<Id, Player>
  clubs: Record<Id, Club>
  leagues: Record<Id, League>
  fixtures: Record<Id, Fixture>
  relationships: Record<Id, Relationship>
  events: Record<Id, GameEvent>
  /** 模板 id → 上次生成它的绝对日序；每日事件靠它做冷却，避免同一周内刷屏。 */
  eventMemory: Record<string, number>
  finance: Finance
  news: NewsItem[]
  season: number
  week: number
  day: number
  totalWeeks: number
  lastMatch: MatchReport | null
  weekPlan: WeeklyPlan
  pendingDayPlan?: PendingDayPlan | null
  seasonSummaries: SeasonSummary[]
  retired?: boolean
  settings: {
    provider: 'openai' | 'anthropic' | 'custom'
    model: string
    narrativeDensity: 'off' | 'lean' | 'standard' | 'rich'
    aiMode: 'template' | 'llm'
    baseUrl?: string
    networkMode?: 'auto' | 'direct' | 'native' | 'proxy'
    tokenParam?: 'max_tokens' | 'max_completion_tokens'
    temperature?: number
    rememberKey?: boolean
  }
  aiNarrative?: AiNarrative
  aiChat?: AiChatMessage[]
  aiUsage?: AiUsage
  aiAction?: { season: number; week: number; actionId: string }
}

export interface CareerCreateOptions {
  name: string
  nationality: string
  age: number
  position: Position
  archetype: Archetype
  background: CareerBackground
  clubId: Id
  seed: number
  /** 建号点买：可选，缺省等价于空对象，旧调用点与旧测试不必改。 */
  allocation?: AttrAllocation
}

export interface WeeklyPlan {
  training: TrainingFocus
  extra: ExtraAction
  /** 本周三特训槽练的绝技 id；缺字段按「本周不练绝技」处理，v9 迁移会补成 null。 */
  specialization?: Id | null
}

/** 比赛日停下来等玩家处理时保存的当日计划；其余时间恒为 null。 */
export interface PendingDayPlan extends WeeklyPlan {
  fixtureId: Id | null
}
