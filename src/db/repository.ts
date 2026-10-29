import { overall } from '../domain'
import {
  CURRENT_SAVE_VERSION,
  SAVE_FORMAT,
  type SaveEnvelope,
  assertWorld,
  saveEnvelopeSchema,
} from '../domain/schema/save.schema'
import type { SaveRecord, SaveSummary, WorldState } from '../domain'
import { hashString } from '../lib'
import { canonicalStringify } from '../lib'
import { db } from './db'

const LAST_SAVE_KEY = 'lastSaveId'

function sortByUpdatedAtDesc(a: SaveSummary, b: SaveSummary): number {
  if (a.updatedAt === b.updatedAt) return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  return a.updatedAt < b.updatedAt ? 1 : -1
}

export function createSaveId(world: WorldState): string {
  return `save:${world.seed}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 6)}`
}

export function summarizeWorld(world: WorldState, id: string): SaveSummary {
  const user = world.players[world.playerId]
  const club = world.clubs[world.clubId]
  return {
    id,
    playerName: user?.name ?? '未知球员',
    clubName: club?.nameZh ?? '自由球员',
    season: world.season,
    week: world.week,
    age: user?.age ?? 0,
    overall: user ? overall(user) : 0,
    updatedAt: world.updatedAt,
  }
}

export async function saveWorld(world: WorldState, id?: string): Promise<SaveSummary> {
  const saveId = id ?? createSaveId(world)
  const record: SaveRecord = {
    id: saveId,
    summary: summarizeWorld(world, saveId),
    world,
  }
  await db.saves.put(record)
  await setLastSaveId(saveId)
  return record.summary
}

export async function loadWorld(id: string): Promise<WorldState | null> {
  const record = await db.saves.get(id)
  if (!record) return null
  return assertWorld(record.world)
}

export async function listSaves(): Promise<SaveSummary[]> {
  const records = await db.saves.toArray()
  return records.map((record) => summarizeWorld(record.world, record.id)).sort(sortByUpdatedAtDesc)
}

export async function deleteSave(id: string): Promise<void> {
  await db.saves.delete(id)
  const last = await getLastSaveId()
  if (last === id) await clearLastSaveId()
}

export async function getLastSaveId(): Promise<string | null> {
  const row = await db.meta.get(LAST_SAVE_KEY)
  return row?.value ?? null
}

export async function setLastSaveId(id: string): Promise<void> {
  await db.meta.put({ key: LAST_SAVE_KEY, value: id })
}

export async function clearLastSaveId(): Promise<void> {
  await db.meta.delete(LAST_SAVE_KEY)
}

export function buildEnvelope(world: WorldState): SaveEnvelope {
  const payload = canonicalStringify(world)
  return {
    format: SAVE_FORMAT,
    saveVersion: CURRENT_SAVE_VERSION,
    engineVersion: world.engineVersion,
    exportedAt: new Date().toISOString(),
    checksum: hashString(payload),
    world,
  }
}

export function exportWorld(world: WorldState): string {
  return JSON.stringify(buildEnvelope(world), null, 2)
}

export function importWorld(text: string): WorldState {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('不是有效的 JSON 文件。')
  }

  const result = saveEnvelopeSchema.safeParse(parsed)
  if (!result.success) {
    const issue = result.error.issues[0]
    const path = issue?.path.join('.') ?? ''
    throw new Error(`存档格式无效${path ? `（${path}）` : ''}：${issue?.message ?? '未知错误'}`)
  }

  const envelope = result.data
  if (envelope.saveVersion > CURRENT_SAVE_VERSION) {
    throw new Error('这个存档来自更新版本的游戏，请先更新。')
  }

  const world = assertWorld(envelope.world)
  const expected = hashString(canonicalStringify(world))
  if (expected !== envelope.checksum) {
    throw new Error('存档校验失败，文件可能已损坏。')
  }

  return world
}
