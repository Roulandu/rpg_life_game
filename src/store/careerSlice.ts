import {
  createSaveId,
  deleteSave,
  getLastSaveId,
  importWorld,
  listSaves,
  loadWorld,
  saveWorld,
} from '../db'
import type { CareerCreateOptions, WorldState } from '../domain'
import { loadApiKey } from '../platform'
import { generateWorld } from '../world'
import { downloadWorld } from './exportSave'
import { messageOf, persist } from './helpers'
import type { GameStore, StoreGet, StoreSet, StoreSlice } from './types'

type CareerSlice = Pick<
  GameStore,
  | 'init'
  | 'refreshSaves'
  | 'createCareer'
  | 'loadGame'
  | 'saveNow'
  | 'removeSave'
  | 'updateSettings'
  | 'importFromText'
  | 'exportCurrent'
  | 'world'
  | 'saveId'
  | 'saves'
  | 'busy'
  | 'hydrated'
>

async function refreshSaves(set: StoreSet): Promise<void> {
  try {
    const saves = await listSaves()
    set({ saves })
  } catch {
    set({ saves: [] })
  }
}

async function init(set: StoreSet): Promise<void> {
  const keyPromise = loadApiKey()
    .then((key) => {
      if (key) set({ aiKeyReady: true, aiKeyHint: '密钥已从本机载入' })
    })
    .catch(() => set({ aiKeyReady: false }))
  await refreshSaves(set)
  try {
    const lastSaveId = await getLastSaveId()
    if (lastSaveId) {
      const world = await loadWorld(lastSaveId)
      if (world) {
        await keyPromise
        set({ world, saveId: lastSaveId, hydrated: true })
        return
      }
    }
  } catch (error) {
    set({ error: `读取上次存档失败：${messageOf(error)}` })
  }
  await keyPromise
  set({ hydrated: true })
}

async function createCareer(
  set: StoreSet,
  get: StoreGet,
  options: CareerCreateOptions,
): Promise<void> {
  set({ busy: true, error: null, notice: null })
  try {
    const now = new Date().toISOString()
    const world = generateWorld(options, now)
    world.updatedAt = now
    const saveId = createSaveId(world)
    await saveWorld(world, saveId)
    set({
      world,
      saveId,
      lastTurn: null,
      seasonTransition: null,
      busy: false,
      notice: '生涯已创建，并自动保存。',
    })
    await get().refreshSaves()
  } catch (error) {
    set({ busy: false, error: `创建生涯失败：${messageOf(error)}` })
    throw error
  }
}

async function loadGame(set: StoreSet, get: StoreGet, id: string): Promise<boolean> {
  set({ busy: true, error: null, notice: null })
  try {
    const world = await loadWorld(id)
    if (!world) throw new Error('找不到这个存档。')
    set({
      world,
      saveId: id,
      lastTurn: null,
      seasonTransition: null,
      busy: false,
    })
    const saved = await persist(world, id)
    if (!saved.ok) set({ error: `保存失败：${saved.error}` })
    await get().refreshSaves()
    return true
  } catch (error) {
    set({ busy: false, error: `读取存档失败：${messageOf(error)}` })
    return false
  }
}

async function saveNow(set: StoreSet, get: StoreGet): Promise<boolean> {
  const world = get().world
  if (!world) return false
  const updated = { ...world, updatedAt: new Date().toISOString() }
  const result = await persist(updated, get().saveId)
  if (!result.ok) {
    set({ error: `保存失败：${result.error}` })
    return false
  }
  set({ world: updated, saveId: result.summary.id, notice: '已保存。' })
  await get().refreshSaves()
  return true
}

async function removeSave(set: StoreSet, get: StoreGet, id: string): Promise<boolean> {
  try {
    await deleteSave(id)
    if (get().saveId === id) {
      set({ world: null, saveId: null, lastTurn: null, seasonTransition: null })
    }
    await get().refreshSaves()
    set({ notice: '存档已删除。' })
    return true
  } catch (error) {
    set({ error: `删除存档失败：${messageOf(error)}` })
    return false
  }
}

function updateSettings(
  set: StoreSet,
  get: StoreGet,
  patch: Partial<WorldState['settings']>,
): void {
  const world = get().world
  if (!world) return
  const next = { ...world, settings: { ...world.settings, ...patch } }
  set({ world: next })
  void persist(next, get().saveId).then((result) => {
    if (!result.ok) set({ error: `保存失败：${result.error}` })
    return get().refreshSaves()
  })
}

async function importFromText(set: StoreSet, get: StoreGet, text: string): Promise<boolean> {
  set({ busy: true, error: null, notice: null })
  try {
    const world = importWorld(text)
    world.updatedAt = new Date().toISOString()
    const saveId = createSaveId(world)
    await saveWorld(world, saveId)
    set({
      world,
      saveId,
      lastTurn: null,
      seasonTransition: null,
      busy: false,
      notice: `已导入 ${world.players[world.playerId]?.name ?? '球员'} 的生涯。`,
    })
    await get().refreshSaves()
    return true
  } catch (error) {
    set({ busy: false, error: `导入失败：${messageOf(error)}` })
    return false
  }
}

function exportCurrent(set: StoreSet, get: StoreGet): void {
  const world = get().world
  if (!world) return
  downloadWorld(world)
  set({ notice: '存档已导出为 JSON 文件。' })
}

export const createCareerSlice: StoreSlice<CareerSlice> = (set, get) => ({
  world: null,
  saveId: null,
  saves: [],
  busy: false,
  hydrated: false,

  init: () => init(set),
  refreshSaves: () => refreshSaves(set),
  createCareer: (options) => createCareer(set, get, options),
  loadGame: (id) => loadGame(set, get, id),
  saveNow: () => saveNow(set, get),
  removeSave: (id) => removeSave(set, get, id),
  updateSettings: (patch) => updateSettings(set, get, patch),
  importFromText: (text) => importFromText(set, get, text),
  exportCurrent: () => exportCurrent(set, get),
})
