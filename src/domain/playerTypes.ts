import type { Id } from './primitiveTypes'

/**
 * 球员的实体子结构：合同、声望、赛季/生涯统计、履历与伤病。
 * 从 `types.ts` 抽出来，让球员本体字段的增改不必把世界状态所在的文件顶破 300 行阈值。
 */

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
  daysLeft: number
  severity: number
}
