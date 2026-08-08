import type { SaveStorage } from './save'

export const RUN_STATS_KEY = 'rpg-life-game:run-stats'

export type RunStats = Record<string, number>

export function loadRunStats(storage: SaveStorage): RunStats {
  const json = storage.getItem(RUN_STATS_KEY)
  if (json === null) return {}
  try {
    const parsed: unknown = JSON.parse(json)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {}
    }
    const result: RunStats = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        result[key] = value
      }
    }
    return result
  } catch {
    return {}
  }
}

export function recordEnding(storage: SaveStorage, endingId: string): RunStats {
  const stats = loadRunStats(storage)
  stats[endingId] = (stats[endingId] ?? 0) + 1
  storage.setItem(RUN_STATS_KEY, JSON.stringify(stats))
  return stats
}
