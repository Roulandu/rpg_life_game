import { saveWorld } from '../db'
import type { SaveSummary, WorldState } from '../domain'

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : '发生了未知错误。'
}

export type PersistResult =
  | { ok: true; summary: SaveSummary }
  | { ok: false; error: string }

export async function persist(world: WorldState, saveId: string | null): Promise<PersistResult> {
  try {
    return { ok: true, summary: await saveWorld(world, saveId ?? undefined) }
  } catch (error) {
    return { ok: false, error: messageOf(error) }
  }
}
