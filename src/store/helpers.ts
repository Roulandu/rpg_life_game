import { saveWorld } from '../db'
import type { SaveSummary, WorldState } from '../domain'
import type { StoreGet, StoreSet } from './types'

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

/** 引擎成交后的写入只有一条路径：换世界、清错误、给播报、落盘。 */
export async function commitSettled(
  set: StoreSet,
  get: StoreGet,
  next: WorldState,
  notice: string,
): Promise<void> {
  next.updatedAt = new Date().toISOString()
  set({ world: next, error: null, notice })
  const saved = await persist(next, get().saveId)
  if (saved.ok) set({ saveId: saved.summary.id })
  else set({ error: `保存失败：${saved.error}` })
}
