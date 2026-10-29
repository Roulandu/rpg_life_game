import { saveWorld } from '../db/repository'
import type { SaveSummary, WorldState } from '../domain/types'

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : '发生了未知错误。'
}

export async function persist(
  world: WorldState,
  saveId: string | null,
): Promise<SaveSummary | null> {
  try {
    return await saveWorld(world, saveId ?? undefined)
  } catch {
    return null
  }
}
