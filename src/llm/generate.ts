import type { AiNarrative, GameEvent, MatchReport, WorldState } from '../domain/types'
import { callStructuredTool } from './client'
import { addUsage, estimateCostUsd } from './cost'
import {
  buildChatSystemPrompt,
  buildChatUserPrompt,
  buildWeekSystemPrompt,
  buildWeekUserPrompt,
  maxTokensForDensity,
} from './prompt'
import { SUBMIT_ACTION_SCHEMA, SUBMIT_WEEK_SCHEMA, sanitizeText, type SubmitWeek } from './schema'
import { SUBMIT_ACTION_TOOL, SUBMIT_WEEK_TOOL } from './tools'
import {
  LlmError,
  type LlmConfig,
  type LlmUsage,
  type StructuredResult,
} from './types'
import { actionUsedThisWeek } from './actions'

export interface LlmSettingsLike {
  provider: 'openai' | 'anthropic' | 'custom'
  model: string
  narrativeDensity: 'off' | 'lean' | 'standard' | 'rich'
  baseUrl?: string
  networkMode?: 'auto' | 'direct' | 'native' | 'proxy'
  tokenParam?: 'max_tokens' | 'max_completion_tokens'
  temperature?: number
}

export function configFromSettings(settings: LlmSettingsLike): LlmConfig {
  return {
    provider: settings.provider,
    model: settings.model.trim(),
    baseUrl: settings.baseUrl?.trim() || undefined,
    networkMode: settings.networkMode ?? 'auto',
    tokenParam: settings.tokenParam ?? 'max_tokens',
    temperature: settings.temperature ?? 0.85,
  }
}

export interface WeekNarration {
  narrative: AiNarrative
  eventPatch: { templateId: string; title: string; body: string } | null
  usage: LlmUsage
  model: string | null
}

function validateWeek(input: unknown, event: GameEvent | null): SubmitWeek {
  const parsed = SUBMIT_WEEK_SCHEMA.safeParse(input)
  if (!parsed.success) {
    throw new LlmError('invalid', parsed.error.issues[0]?.message ?? '叙事字段不完整')
  }
  if (parsed.data.event && !event) {
    throw new LlmError('invalid', '本周没有引擎事件，不能新增事件')
  }
  if (parsed.data.event && event && parsed.data.event.templateId !== event.templateId) {
    throw new LlmError('invalid', '事件模板与引擎不一致')
  }
  return parsed.data
}

export async function narrateWeek(options: {
  world: WorldState
  match: MatchReport | null
  event: GameEvent | null
  seasonPlayed: number
  weekPlayed: number
  apiKey: string
  settings: LlmSettingsLike
}): Promise<WeekNarration> {
  const { world, match, event, apiKey, settings } = options
  if (settings.narrativeDensity === 'off') throw new LlmError('config', '叙事密度已关闭。')

  const config = configFromSettings(settings)
  const system = buildWeekSystemPrompt(settings.narrativeDensity)
  const playedWorld: WorldState = {
    ...world,
    season: options.seasonPlayed,
    week: options.weekPlayed,
  }
  const baseUser = buildWeekUserPrompt(playedWorld, match, event)
  let user = baseUser
  let lastError: unknown = null
  let parsed: SubmitWeek | null = null
  let result: StructuredResult | null = null

  for (let attempt = 0; attempt < 2 && !parsed; attempt += 1) {
    result = await callStructuredTool({
      config,
      apiKey,
      system,
      user,
      tool: SUBMIT_WEEK_TOOL,
      maxTokens: maxTokensForDensity(settings.narrativeDensity),
    })
    try {
      parsed = validateWeek(result.input, event)
    } catch (error) {
      lastError = error
      user = `${baseUser}\n\n上一次输出未通过校验：${
        error instanceof Error ? error.message : '格式错误'
      }。请重新调用 submit_week，并严格遵守字段长度与 templateId 约束。`
    }
  }

  if (!parsed || !result) {
    throw lastError instanceof LlmError ? lastError : new LlmError('invalid', '叙事输出无法通过校验')
  }

  const narrative: AiNarrative = {
    season: options.seasonPlayed,
    week: options.weekPlayed,
    headline: sanitizeText(parsed.headlineZh, 24) || '本周',
    body: sanitizeText(parsed.narrativeZh, 800),
    npcNote: parsed.npcNoteZh ? sanitizeText(parsed.npcNoteZh, 60) : undefined,
    suggestedAction: parsed.suggestedActionZh ? sanitizeText(parsed.suggestedActionZh, 30) : undefined,
    createdAt: new Date().toISOString(),
  }

  const eventPatch =
    parsed.event && event
      ? {
          templateId: event.templateId,
          title: sanitizeText(parsed.event.titleZh, 30) || event.title,
          body: sanitizeText(parsed.event.bodyZh, 320) || event.body,
        }
      : null

  return {
    narrative,
    eventPatch,
    usage: result.usage,
    model: result.model,
  }
}

export interface ChatReply {
  text: string
  actionId: 'none' | 'talk_coach' | 'rest' | 'extra_training' | 'media_interview'
  usage: LlmUsage
  model: string | null
}

export async function generateChatReply(options: {
  world: WorldState
  playerMessage: string
  apiKey: string
  settings: LlmSettingsLike
}): Promise<ChatReply> {
  const { world, playerMessage, apiKey, settings } = options
  const config = configFromSettings(settings)
  const system = buildChatSystemPrompt()
  const baseUser = buildChatUserPrompt(
    world,
    world.aiChat ?? [],
    playerMessage,
    actionUsedThisWeek(world),
  )
  let user = baseUser
  let lastError: unknown = null

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await callStructuredTool({
      config,
      apiKey,
      system,
      user,
      tool: SUBMIT_ACTION_TOOL,
      maxTokens: 500,
    })
    const parsed = SUBMIT_ACTION_SCHEMA.safeParse(result.input)
    if (!parsed.success) {
      lastError = new LlmError('invalid', parsed.error.issues[0]?.message ?? '对话字段不完整')
      user = `${baseUser}\n\n上一次输出未通过校验：${
        lastError instanceof Error ? lastError.message : '格式错误'
      }。请重新调用 submit_action。`
      continue
    }

    return {
      text: sanitizeText(parsed.data.replyZh, 400),
      actionId: parsed.data.actionId,
      usage: result.usage,
      model: result.model,
    }
  }

  throw lastError instanceof LlmError ? lastError : new LlmError('invalid', '对话输出无法通过校验')
}

export function applyWeekNarrative(
  world: WorldState,
  eventId: string | null,
  narration: WeekNarration,
): void {
  const event = eventId ? world.events[eventId] : undefined
  if (
    event &&
    event.status === 'open' &&
    narration.eventPatch &&
    narration.eventPatch.templateId === event.templateId
  ) {
    event.title = narration.eventPatch.title
    event.body = narration.eventPatch.body
    event.source = 'llm'
  }
  world.aiNarrative = narration.narrative
}

export function accumulateUsage(world: WorldState, model: string | null, usage: LlmUsage): void {
  world.aiUsage = addUsage(world.aiUsage, model ?? 'unknown', usage)
}

export function usageCost(model: string, usage: LlmUsage): number {
  return estimateCostUsd(model, usage)
}
