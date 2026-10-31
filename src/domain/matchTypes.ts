import type { Id, Position, WeeklyPlan } from './types'

export type FixtureStatus = 'scheduled' | 'live' | 'played'

export interface Fixture {
  id: Id
  competitionId: Id
  season: number
  week: number
  round: number
  homeId: Id
  awayId: Id
  status: FixtureStatus
  homeGoals?: number
  awayGoals?: number
  report?: MatchReport | null
}

export type MatchEventType =
  | 'goal'
  | 'assist'
  | 'chance'
  | 'save'
  | 'card'
  | 'injury'
  | 'sub'
  | 'info'
  | 'fulltime'

export interface MatchEventLine {
  minute: number
  type: MatchEventType
  text: string
  isUser?: boolean
}

export interface MatchGoal {
  minute: number
  side: 'home' | 'away'
  scorerId: Id
  scorerName: string
  assistId?: Id
  assistName?: string
  isUser?: boolean
  isUserAssist?: boolean
  fromKeyMoment?: boolean
}

export interface MatchReport {
  fixtureId: Id
  season: number
  week: number
  homeId: Id
  awayId: Id
  homeName: string
  awayName: string
  status: 'live' | 'final'
  currentMinute: number
  homeGoals: number
  awayGoals: number
  halfTimeHomeGoals?: number
  halfTimeAwayGoals?: number
  goals: MatchGoal[]
  userPlayed: boolean
  userStarted: boolean
  userMinutes: number
  userGoals: number
  userAssists: number
  userRating: number | null
  userPosition: Position | null
  events: MatchEventLine[]
  motmName: string
  motmRating: number
  attendance: number
  keyMoments?: KeyMoment[]
  mediaReaction?: string
}

export type KeyMomentKind = 'bigChance' | 'penalty' | 'throughBall' | 'duel' | 'save' | 'clearance'

export interface KeyMomentOption {
  id: string
  labelZh: string
  descriptionZh: string
  successChance: number
  ratingOnSuccess: number
  ratingOnFail: number
  goalOnSuccess?: boolean
  assistOnSuccess?: boolean
  coachOnSuccess?: number
  coachOnFail?: number
  moraleOnSuccess?: number
  moraleOnFail?: number
}

export interface KeyMomentOutcome {
  optionId: string
  success: boolean
  textZh: string
  ratingDelta: number
  moraleDelta: number
  coachDelta: number
  goal: boolean
  assist: boolean
}

export interface KeyMoment {
  id: string
  minute: number
  kind: KeyMomentKind
  titleZh: string
  promptZh: string
  options: KeyMomentOption[]
  defaultOptionId: string
  roll: number
  outcome?: KeyMomentOutcome
}

export interface PendingWeekPlan extends WeeklyPlan {
  fixtureId: Id | null
}
