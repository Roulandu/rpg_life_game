import { create } from 'zustand'
import {
  createSaveId,
  deleteSave,
  downloadWorld,
  getLastSaveId,
  importWorld,
  listSaves,
  loadWorld,
  saveWorld,
} from '../db/repository'
import type {
  AiChatMessage,
  CareerCreateOptions,
  MatchReport,
  SaveSummary,
  WeeklyPlan,
  WorldState,
} from '../domain/types'
import { resolveEvent } from '../engine/events'
import {
  autoResolveKeyMoments,
  finalizeMatchday,
  hasPendingKeyMoments,
  resolveKeyMoment as applyKeyMomentChoice,
} from '../engine/keyMoments'
import { advanceWeek, type SeasonTransition, type TurnResult } from '../engine/turn'
import {
  accumulateUsage,
  applyWeekNarrative,
  generateChatReply,
  narrateWeek,
} from '../llm/generate'
import { resolveChatAction } from '../llm/actions'
import { applyChatActionProposal } from '../engine/chatAction'
import { sanitizeText } from '../llm/schema'
import { testLlmConnection, type ConnectionTestResult } from '../llm/client'
import { describeLlmError } from '../llm/types'
import {
  clearApiKey as clearStoredApiKey,
  getLoadedApiKey,
  loadApiKey,
  saveApiKey as storeApiKey,
} from '../platform/keyStore'
import { generateWorld } from '../world/generator'

interface GameStore {
  world: WorldState | null
  saveId: string | null
  saves: SaveSummary[]
  lastTurn: TurnResult | null
  seasonTransition: SeasonTransition | null
  busy: boolean
  hydrated: boolean
  notice: string | null
  error: string | null
  aiKeyReady: boolean
  aiKeyHint: string | null
  aiBusy: boolean
  aiError: string | null
  clearAiError: () => void
  init: () => Promise<void>
  refreshSaves: () => Promise<void>
  createCareer: (options: CareerCreateOptions) => Promise<void>
  loadGame: (id: string) => Promise<void>
  saveNow: () => Promise<void>
  removeSave: (id: string) => Promise<void>
  advance: (plan: WeeklyPlan) => Promise<TurnResult | null>
  resolveKeyMoment: (momentId: string, optionId: string) => Promise<void>
  skipKeyMoments: () => Promise<void>
  narrateTurn: (result: TurnResult) => Promise<void>
  resolveChoice: (eventId: string, choiceId: string) => Promise<void>
  updateSettings: (patch: Partial<WorldState['settings']>) => void
  setApiKey: (key: string, remember: boolean) => Promise<void>
  clearApiKey: () => Promise<void>
  testAi: () => Promise<ConnectionTestResult>
  sendChat: (message: string) => Promise<void>
  importFromText: (text: string) => Promise<void>
  exportCurrent: () => void
  dismissSeason: () => void
  clearLastTurn: () => void
  setNotice: (notice: string | null) => void
  setError: (error: string | null) => void
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : '发生了未知错误。'
}

async function persist(world: WorldState, saveId: string | null): Promise<SaveSummary | null> {
  try {
    return await saveWorld(world, saveId ?? undefined)
  } catch {
    return null
  }
}

let aiTaskSeq = 0

function narrateCompletedMatch(
  get: () => GameStore,
  world: WorldState,
  result: MatchReport | null,
): void {
  if (!result) return
  const latest = get().lastTurn
  void get().narrateTurn({
    world,
    match: world.lastMatch ?? result,
    event: latest?.event ?? null,
    seasonTransition: latest?.seasonTransition ?? null,
    weekPlayed: result.week,
    seasonPlayed: result.season,
  })
}

export const useGameStore = create<GameStore>()((set, get) => ({
  world: null,
  saveId: null,
  saves: [],
  lastTurn: null,
  seasonTransition: null,
  busy: false,
  hydrated: false,
  notice: null,
  error: null,
  aiKeyReady: false,
  aiKeyHint: null,
  aiBusy: false,
  aiError: null,

  init: async () => {
    const keyPromise = loadApiKey()
      .then((key) => {
        if (key) set({ aiKeyReady: true, aiKeyHint: '密钥已从本机载入' })
      })
      .catch(() => set({ aiKeyReady: false }))
    await get().refreshSaves()
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
  },

  refreshSaves: async () => {
    try {
      const saves = await listSaves()
      set({ saves })
    } catch {
      set({ saves: [] })
    }
  },

  createCareer: async (options) => {
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
  },

  loadGame: async (id) => {
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
      await saveWorld(world, id)
      await get().refreshSaves()
    } catch (error) {
      set({ busy: false, error: `读取存档失败：${messageOf(error)}` })
    }
  },

  saveNow: async () => {
    const world = get().world
    if (!world) return
    const updated = { ...world, updatedAt: new Date().toISOString() }
    const summary = await persist(updated, get().saveId)
    set({ world: updated, saveId: summary?.id ?? get().saveId, notice: '已保存。' })
    await get().refreshSaves()
  },

  removeSave: async (id) => {
    try {
      await deleteSave(id)
      if (get().saveId === id) {
        set({ world: null, saveId: null, lastTurn: null, seasonTransition: null })
      }
      await get().refreshSaves()
      set({ notice: '存档已删除。' })
    } catch (error) {
      set({ error: `删除存档失败：${messageOf(error)}` })
    }
  },

  advance: async (plan) => {
    const world = get().world
    if (!world || get().busy || world.retired) return null
    if (hasPendingKeyMoments(world)) {
      set({ error: '请先在比赛日完成本周的关键回合。' })
      return null
    }
    set({ busy: true, error: null, notice: null })
    try {
      const result = advanceWeek(world, plan)
      const updated = { ...result.world, updatedAt: new Date().toISOString() }
      const adapted: TurnResult = { ...result, world: updated }
      set({
        world: updated,
        lastTurn: adapted,
        seasonTransition: result.seasonTransition,
        busy: false,
      })
      const summary = await persist(updated, get().saveId)
      if (summary) set({ saveId: summary.id })
      await get().refreshSaves()
      if (!hasPendingKeyMoments(updated)) void get().narrateTurn(adapted)
      return adapted
    } catch (error) {
      set({ busy: false, error: `推进失败：${messageOf(error)}` })
      return null
    }
  },

  resolveKeyMoment: async (momentId, optionId) => {
    const world = get().world
    const saveId = get().saveId
    if (!world || !saveId || get().busy) return
    const next = structuredClone(world)
    const report = applyKeyMomentChoice(next, momentId, optionId)
    if (!report) {
      set({ error: '这个关键回合已经结束，或选项无效。' })
      return
    }
    const stillPending = hasPendingKeyMoments(next)
    if (!stillPending) finalizeMatchday(next)
    next.updatedAt = new Date().toISOString()
    set({ world: next })
    const summary = await persist(next, saveId)
    if (summary) set({ saveId: summary.id })
    await get().refreshSaves()
    if (!stillPending) narrateCompletedMatch(get, next, report)
  },

  skipKeyMoments: async () => {
    const world = get().world
    const saveId = get().saveId
    if (!world || !saveId || get().busy || !hasPendingKeyMoments(world)) return
    const next = structuredClone(world)
    const report = autoResolveKeyMoments(next)
    if (!report) return
    finalizeMatchday(next)
    next.updatedAt = new Date().toISOString()
    set({ world: next, notice: '关键回合已按稳妥选择自动处理。' })
    const summary = await persist(next, saveId)
    if (summary) set({ saveId: summary.id })
    await get().refreshSaves()
    narrateCompletedMatch(get, next, report)
  },

  narrateTurn: async (result) => {
    const world = get().world
    const saveId = get().saveId
    if (!world || !saveId) return
    if (world.settings.aiMode !== 'llm' || world.settings.narrativeDensity === 'off') return
    const apiKey = getLoadedApiKey()
    if (!apiKey) {
      set({ aiError: '还没有保存 API Key，本周使用本地模板叙事。' })
      return
    }

    const season = world.season
    const week = world.week
    const taskId = ++aiTaskSeq
    set({ aiBusy: true, aiError: null })
    try {
      const narration = await narrateWeek({
        world,
        match: result.match,
        event: result.event,
        seasonPlayed: result.seasonPlayed,
        weekPlayed: result.weekPlayed,
        apiKey,
        settings: world.settings,
      })
      const current = get().world
      if (!current || get().saveId !== saveId || current.season !== season || current.week !== week) {
        if (aiTaskSeq === taskId) set({ aiBusy: false })
        return
      }
      const next = structuredClone(current)
      applyWeekNarrative(next, result.event?.id ?? null, narration)
      accumulateUsage(next, narration.model, narration.usage)
      next.updatedAt = new Date().toISOString()
      if (aiTaskSeq === taskId) set({ world: next, aiBusy: false })
      const summary = await persist(next, saveId)
      if (summary) set({ saveId: summary.id })
      await get().refreshSaves()
    } catch (error) {
      const current = get().world
      if (!current || get().saveId !== saveId || current.season !== season || current.week !== week) {
        if (aiTaskSeq === taskId) set({ aiBusy: false })
        return
      }
      if (aiTaskSeq === taskId) {
        set({ aiBusy: false, aiError: `${describeLlmError(error)} 本周已保留本地模板叙事。` })
      }
    }
  },

  resolveChoice: async (eventId, choiceId) => {
    const world = get().world
    if (!world) return
    const next = structuredClone(world)
    const event = resolveEvent(next, eventId, choiceId)
    if (!event) {
      set({ error: '这个事件已经处理过，或选项无效。' })
      return
    }
    next.updatedAt = new Date().toISOString()
    set({ world: next, notice: `已处理：${event.title}` })
    const summary = await persist(next, get().saveId)
    if (summary) set({ saveId: summary.id })
    await get().refreshSaves()
  },

  updateSettings: (patch) => {
    const world = get().world
    if (!world) return
    const next = { ...world, settings: { ...world.settings, ...patch } }
    set({ world: next })
    void persist(next, get().saveId).then(() => get().refreshSaves())
  },

  setApiKey: async (key, remember) => {
    const trimmed = key.trim()
    if (!trimmed) {
      set({ aiError: 'API Key 不能为空。' })
      return
    }
    try {
      const stored = await storeApiKey(trimmed, remember)
      const hint =
        stored.persisted === 'native'
          ? '已保存到 Android 安全存储'
          : stored.persisted === 'encrypted'
            ? '已加密保存在本机浏览器'
            : '仅保留在本次会话，刷新后需要重新填写'
      set({ aiKeyReady: true, aiKeyHint: hint, aiError: null, notice: stored.warning ?? 'API Key 已载入。' })
      if (get().world) get().updateSettings({ rememberKey: remember })
    } catch (error) {
      set({ aiError: `保存 API Key 失败：${messageOf(error)}` })
    }
  },

  clearApiKey: async () => {
    try {
      await clearStoredApiKey()
      set({ aiKeyReady: false, aiKeyHint: null, notice: 'API Key 已从本机清除。' })
    } catch (error) {
      set({ aiError: `清除 API Key 失败：${messageOf(error)}` })
    }
  },

  testAi: async () => {
    const world = get().world
    const apiKey = getLoadedApiKey()
    if (!world || !apiKey) {
      return { ok: false, message: '请先保存 API Key。', latencyMs: 0, model: null }
    }
    return testLlmConnection(
      {
        provider: world.settings.provider,
        model: world.settings.model.trim(),
        baseUrl: world.settings.baseUrl?.trim() || undefined,
        networkMode: world.settings.networkMode ?? 'auto',
        tokenParam: world.settings.tokenParam ?? 'max_tokens',
        temperature: world.settings.temperature ?? 0.85,
      },
      apiKey,
    )
  },

  sendChat: async (message) => {
    const world = get().world
    const saveId = get().saveId
    if (!world || !saveId || get().aiBusy) return
    const text = sanitizeText(message, 400)
    if (!text) {
      set({ aiError: '请输入想说的话。' })
      return
    }
    if (world.settings.aiMode !== 'llm') {
      set({ aiError: 'AI 对话未启用，请先在设置里打开。' })
      return
    }
    const apiKey = getLoadedApiKey()
    if (!apiKey) {
      set({ aiError: '请先在设置里保存 API Key。' })
      return
    }

    const season = world.season
    const week = world.week
    const now = new Date().toISOString()
    const userMessage: AiChatMessage = {
      id: `chat-${season}-${week}-${world.aiChat?.length ?? 0}-u`,
      role: 'user',
      text,
      season,
      week,
      createdAt: now,
    }
    const withUser = structuredClone(world)
    withUser.aiChat = [...(withUser.aiChat ?? []), userMessage].slice(-40)
    const taskId = ++aiTaskSeq
    set({ world: withUser, aiBusy: true, aiError: null })

    try {
      const reply = await generateChatReply({
        world: withUser,
        playerMessage: text,
        apiKey,
        settings: withUser.settings,
      })
      const current = get().world
      if (!current || get().saveId !== saveId) {
        if (aiTaskSeq === taskId) set({ aiBusy: false })
        return
      }
      const next = structuredClone(current)
      const proposal =
        next.season === season && next.week === week ? resolveChatAction(next, reply.actionId) : null
      const actionLabel = proposal ? applyChatActionProposal(next, proposal) : undefined
      next.aiChat = [
        ...(next.aiChat ?? []),
        {
          id: `chat-${season}-${week}-${next.aiChat?.length ?? 0}-a`,
          role: 'assistant',
          text: reply.text,
          season,
          week,
          actionLabel,
          createdAt: new Date().toISOString(),
        } satisfies AiChatMessage,
      ].slice(-40)
      accumulateUsage(next, reply.model, reply.usage)
      next.updatedAt = new Date().toISOString()
      if (aiTaskSeq === taskId) set({ world: next, aiBusy: false })
      const summary = await persist(next, saveId)
      if (summary) set({ saveId: summary.id })
      await get().refreshSaves()
    } catch (error) {
      if (aiTaskSeq === taskId) set({ aiBusy: false, aiError: describeLlmError(error) })
    }
  },

  importFromText: async (text) => {
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
    } catch (error) {
      set({ busy: false, error: `导入失败：${messageOf(error)}` })
    }
  },

  exportCurrent: () => {
    const world = get().world
    if (!world) return
    downloadWorld(world)
    set({ notice: '存档已导出为 JSON 文件。' })
  },

  dismissSeason: () => set({ seasonTransition: null }),
  clearLastTurn: () => set({ lastTurn: null }),
  clearAiError: () => set({ aiError: null }),
  setNotice: (notice) => set({ notice }),
  setError: (error) => set({ error }),
}))
