import type { AiChatMessage, WorldState } from '../domain'
import { applyChatActionProposal } from '../engine'
import type { TurnResult } from '../engine'
import { resolveChatAction } from '../llm'
import {
  accumulateUsage,
  applyWeekNarrative,
  generateChatReply,
  narrateWeek,
} from '../llm'
import { sanitizeText } from '../llm'
import { describeLlmError } from '../llm'
import { getLoadedApiKey } from '../platform'
import { persist } from './helpers'
import type { StoreGet, StoreSet } from './types'

type ChatReply = Awaited<ReturnType<typeof generateChatReply>>

interface NarrationInput {
  world: WorldState
  saveId: string
  apiKey: string
  result: TurnResult
  season: number
  week: number
  taskId: number
}

interface ChatInput {
  world: WorldState
  saveId: string
  text: string
  apiKey: string
  season: number
  week: number
  taskId: number
}

let aiTaskSeq = 0

function buildUserMessage(
  world: WorldState,
  text: string,
  season: number,
  week: number,
  now: string,
): AiChatMessage {
  return {
    id: `chat-${season}-${week}-${world.aiChat?.length ?? 0}-u`,
    role: 'user',
    text,
    season,
    week,
    createdAt: now,
  }
}

function buildAssistantMessage(
  world: WorldState,
  reply: ChatReply,
  season: number,
  week: number,
  actionLabel: string | undefined,
): AiChatMessage {
  return {
    id: `chat-${season}-${week}-${world.aiChat?.length ?? 0}-a`,
    role: 'assistant',
    text: reply.text,
    season,
    week,
    actionLabel,
    createdAt: new Date().toISOString(),
  }
}

function appendAssistantReply(
  world: WorldState,
  reply: ChatReply,
  season: number,
  week: number,
): string | undefined {
  const proposal =
    world.season === season && world.week === week ? resolveChatAction(world, reply.actionId) : null
  const actionLabel = proposal ? applyChatActionProposal(world, proposal) : undefined
  world.aiChat = [
    ...(world.aiChat ?? []),
    buildAssistantMessage(world, reply, season, week, actionLabel),
  ].slice(-40)
  accumulateUsage(world, reply.model, reply.usage)
  return actionLabel
}

function clearBusyIfCurrent(set: StoreSet, taskId: number): void {
  if (aiTaskSeq === taskId) set({ aiBusy: false })
}

function freshWorld(
  get: StoreGet,
  saveId: string,
  season: number,
  week: number,
): WorldState | null {
  const current = get().world
  if (!current || get().saveId !== saveId || current.season !== season || current.week !== week) {
    return null
  }
  return current
}

function currentSaveWorld(get: StoreGet, saveId: string): WorldState | null {
  const current = get().world
  if (!current || get().saveId !== saveId) return null
  return current
}

function shouldNarrate(world: WorldState): boolean {
  return world.settings.aiMode === 'llm' && world.settings.narrativeDensity !== 'off'
}

async function commitAiWorld(
  set: StoreSet,
  get: StoreGet,
  taskId: number,
  world: WorldState,
  saveId: string,
): Promise<void> {
  world.updatedAt = new Date().toISOString()
  if (aiTaskSeq === taskId) set({ world, aiBusy: false })
  const summary = await persist(world, saveId)
  if (summary) set({ saveId: summary.id })
  await get().refreshSaves()
}

async function runNarration(set: StoreSet, get: StoreGet, input: NarrationInput): Promise<void> {
  try {
    const narration = await narrateWeek({
      world: input.world,
      match: input.result.match,
      event: input.result.event,
      seasonPlayed: input.result.seasonPlayed,
      weekPlayed: input.result.weekPlayed,
      apiKey: input.apiKey,
      settings: input.world.settings,
    })
    const current = freshWorld(get, input.saveId, input.season, input.week)
    if (!current) {
      clearBusyIfCurrent(set, input.taskId)
      return
    }
    const next = structuredClone(current)
    applyWeekNarrative(next, input.result.event?.id ?? null, narration)
    accumulateUsage(next, narration.model, narration.usage)
    await commitAiWorld(set, get, input.taskId, next, input.saveId)
  } catch (error) {
    if (!freshWorld(get, input.saveId, input.season, input.week)) {
      clearBusyIfCurrent(set, input.taskId)
      return
    }
    if (aiTaskSeq === input.taskId) {
      set({ aiBusy: false, aiError: `${describeLlmError(error)} 本周已保留本地模板叙事。` })
    }
  }
}

export async function narrateTurn(
  set: StoreSet,
  get: StoreGet,
  result: TurnResult,
): Promise<void> {
  const world = get().world
  const saveId = get().saveId
  if (!world || !saveId) return
  if (!shouldNarrate(world)) return
  const apiKey = getLoadedApiKey()
  if (!apiKey) {
    set({ aiError: '还没有保存 API Key，本周使用本地模板叙事。' })
    return
  }
  const season = world.season
  const week = world.week
  const taskId = ++aiTaskSeq
  set({ aiBusy: true, aiError: null })
  await runNarration(set, get, { world, saveId, apiKey, result, season, week, taskId })
}

async function deliverChatReply(
  set: StoreSet,
  get: StoreGet,
  input: ChatInput,
): Promise<void> {
  try {
    const reply = await generateChatReply({
      world: input.world,
      playerMessage: input.text,
      apiKey: input.apiKey,
      settings: input.world.settings,
    })
    const current = currentSaveWorld(get, input.saveId)
    if (!current) {
      clearBusyIfCurrent(set, input.taskId)
      return
    }
    const next = structuredClone(current)
    appendAssistantReply(next, reply, input.season, input.week)
    await commitAiWorld(set, get, input.taskId, next, input.saveId)
  } catch (error) {
    if (aiTaskSeq === input.taskId) set({ aiBusy: false, aiError: describeLlmError(error) })
  }
}

export async function sendChat(set: StoreSet, get: StoreGet, message: string): Promise<void> {
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
  const withUser = structuredClone(world)
  withUser.aiChat = [
    ...(withUser.aiChat ?? []),
    buildUserMessage(world, text, season, week, new Date().toISOString()),
  ].slice(-40)
  const taskId = ++aiTaskSeq
  set({ world: withUser, aiBusy: true, aiError: null })
  await deliverChatReply(set, get, { world: withUser, saveId, text, apiKey, season, week, taskId })
}
