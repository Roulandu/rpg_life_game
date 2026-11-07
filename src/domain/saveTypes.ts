import type { WorldState } from './types'

/**
 * 存档列表用的摘要投影。它只是 `WorldState` 的派生缓存：写入时重算、读取时也重算，
 * 因此不属于存档文件结构，加字段不需要升存档版本。
 */
export interface SaveSummary {
  id: string
  playerName: string
  clubName: string
  season: number
  week: number
  day: number
  age: number
  overall: number
  /** 世界种子：同一份档的两行只靠周期分不开，种子才是「这是不是同一段人生」的判据。 */
  seed: number
  /** 建档时间（`world.createdAt`），与 `updatedAt` 一起用来分辨同名同周期的存档。 */
  createdAt: string
  updatedAt: string
}

export interface SaveRecord {
  id: string
  summary: SaveSummary
  world: WorldState
}
