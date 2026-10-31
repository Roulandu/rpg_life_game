import type { Fixture, MatchReport, PendingWeekPlan } from './matchTypes'

export type Id = string

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
  PendingWeekPlan,
} from './matchTypes'

export type Position = 'GK' | 'CB' | 'LB' | 'RB' | 'DM' | 'CM' | 'AM' | 'LW' | 'RW' | 'ST'

export type AttrKey =
  | 'pace'
  | 'shooting'
  | 'passing'
  | 'dribbling'
  | 'defending'
  | 'physical'
  | 'mental'
  | 'technique'
  | 'stamina'
  | 'goalkeeping'

export type Attributes = Record<AttrKey, number>

export type Foot = 'L' | 'R' | 'B'

export type TrainingFocus = 'physical' | 'technical' | 'tactical' | 'recovery'

export type ExtraAction = 'media' | 'agent' | 'social' | 'rest' | 'family' | 'none'

export type Archetype = 'speedster' | 'technician' | 'engine' | 'finisher' | 'wall'

export type CareerBackground = 'academy' | 'lowerLeague' | 'overseas'

export interface Contract {
  clubId: Id
  wageWeekly: number
  startSeason: number
  endSeason: number
  releaseClause?: number
  signingBonus?: number
}

export interface Reputation {
  local: number
  national: number
  continental: number
  world: number
  fanbase: number
  media: number
}

export interface SeasonStat {
  season: number
  clubId: Id
  appearances: number
  starts: number
  minutes: number
  goals: number
  assists: number
  ratingSum: number
  ratingCount: number
  yellowCards: number
  redCards: number
}

export interface CareerEntry {
  season: number
  age: number
  clubId: Id
  clubName: string
  tier: number
  appearances: number
  goals: number
  assists: number
  averageRating: number
  note?: string
}

export interface Injury {
  kind: string
  weeksLeft: number
  severity: number
}

export interface Player {
  id: Id
  name: string
  nationality: string
  birthYear: number
  age: number
  position: Position
  foot: Foot
  attributes: Attributes
  potential: number
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

export type RelationshipRole = 'coach' | 'teammate' | 'agent' | 'family' | 'media' | 'fan'

export interface Relationship {
  id: Id
  name: string
  role: RelationshipRole
  trust: number
  tension: number
  summary: string
  lastInteractionWeek?: number
}

export type EffectOp =
  | 'morale'
  | 'fitness'
  | 'sharpness'
  | 'confidence'
  | 'coachTrust'
  | 'teammateTrust'
  | 'agentTrust'
  | 'familyTrust'
  | 'mediaRep'
  | 'fanRep'
  | 'money'

export interface Effect {
  op: EffectOp
  delta: number
}

export interface EventChoice {
  id: string
  label: string
  description?: string
  effects: Effect[]
}

export interface GameEvent {
  id: Id
  templateId: string
  title: string
  body: string
  season: number
  week: number
  createdAtWeek: number
  expiresWeek: number
  status: 'open' | 'resolved' | 'expired'
  choices: EventChoice[]
  resultText?: string
  source: 'template' | 'llm'
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
  finance: Finance
  news: NewsItem[]
  season: number
  week: number
  totalWeeks: number
  lastMatch: MatchReport | null
  pendingWeekPlan?: PendingWeekPlan | null
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

export interface AiNarrative {
  season: number
  week: number
  headline: string
  body: string
  npcNote?: string
  suggestedAction?: string
  createdAt: string
}

export interface AiChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  season: number
  week: number
  actionLabel?: string
  createdAt: string
}

export interface AiUsage {
  promptTokens: number
  completionTokens: number
  calls: number
  costUsd: number
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
}

export interface WeeklyPlan {
  training: TrainingFocus
  extra: ExtraAction
}

export interface SaveSummary {
  id: string
  playerName: string
  clubName: string
  season: number
  week: number
  age: number
  overall: number
  updatedAt: string
}

export interface SaveRecord {
  id: string
  summary: SaveSummary
  world: WorldState
}
