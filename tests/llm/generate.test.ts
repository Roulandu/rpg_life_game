import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameEvent, WorldState } from '../../src/domain/types'
import { generateChatReply, narrateWeek } from '../../src/llm/generate'
import { LlmError } from '../../src/llm/types'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

vi.mock('../../src/llm/client', () => ({
  callStructuredTool: vi.fn(),
}))

import { callStructuredTool } from '../../src/llm/client'

const mockedCall = vi.mocked(callStructuredTool)

const settings = {
  provider: 'openai' as const,
  model: 'gpt-4.1-mini',
  narrativeDensity: 'standard' as const,
}

function testEvent(): GameEvent {
  return {
    id: 'event:test:1',
    templateId: 'event:media-test',
    title: '训练场边的采访',
    body: '记者想听听你的想法。',
    season: 1,
    week: 1,
    createdAtWeek: 1,
    expiresWeek: 3,
    status: 'open',
    choices: [{ id: 'choice:1', label: '接受采访', effects: [] }],
    source: 'template',
  }
}

function weekResult(input: unknown, overrides: Partial<{ promptTokens: number; completionTokens: number }> = {}) {
  return {
    input,
    text: '',
    usage: {
      promptTokens: overrides.promptTokens ?? 180,
      completionTokens: overrides.completionTokens ?? 90,
    },
    model: 'gpt-4.1-mini',
  }
}

function setupWorld(): WorldState {
  return generateWorld(testOptions(), TEST_NOW)
}

describe('narrateWeek', () => {
  beforeEach(() => {
    mockedCall.mockReset()
  })

  it('sanitizes the narrative and patches the engine event', async () => {
    mockedCall.mockResolvedValueOnce(
      weekResult({
        headlineZh: '雨后的训练场',
        narrativeZh: '第一段\n第二段 <b>加练</b>，你留到了最后。',
        npcNoteZh: '教练点了点头。',
        suggestedActionZh: '找教练谈谈',
        event: {
          templateId: 'event:media-test',
          titleZh: '混采区的提问',
          bodyZh: '记者问起你最近的出场时间。',
        },
      }),
    )

    const world = setupWorld()
    const event = testEvent()
    const result = await narrateWeek({
      world,
      match: null,
      event,
      seasonPlayed: 1,
      weekPlayed: 1,
      apiKey: 'key',
      settings,
    })

    expect(result.narrative.headline).toBe('雨后的训练场')
    expect(result.narrative.body).toBe('第一段 第二段 加练，你留到了最后。')
    expect(result.narrative.npcNote).toBe('教练点了点头。')
    expect(result.narrative.suggestedAction).toBe('找教练谈谈')
    expect(result.eventPatch).toEqual({
      templateId: 'event:media-test',
      title: '混采区的提问',
      body: '记者问起你最近的出场时间。',
    })
    expect(result.usage).toEqual({ promptTokens: 180, completionTokens: 90 })
    expect(mockedCall).toHaveBeenCalledTimes(1)
  })

  it('rejects event templates that do not match the engine', async () => {
    mockedCall.mockResolvedValue(
      weekResult({
        headlineZh: '标题',
        narrativeZh: '正文',
        event: { templateId: 'event:other', titleZh: '别的', bodyZh: '不该出现' },
      }),
    )

    await expect(
      narrateWeek({
        world: setupWorld(),
        match: null,
        event: testEvent(),
        seasonPlayed: 1,
        weekPlayed: 1,
        apiKey: 'key',
        settings,
      }),
    ).rejects.toBeInstanceOf(LlmError)

    expect(mockedCall).toHaveBeenCalledTimes(2)
    const second = mockedCall.mock.calls[1]![0]
    expect(second.user).toContain('未通过校验')
    expect(second.user).toContain('event:media-test')
  })

  it('retries once after schema failure', async () => {
    mockedCall
      .mockResolvedValueOnce(weekResult({ headlineZh: '一'.repeat(25), narrativeZh: '正文' }))
      .mockResolvedValueOnce(weekResult({ headlineZh: '合规标题', narrativeZh: '合规正文' }))

    const result = await narrateWeek({
      world: setupWorld(),
      match: null,
      event: null,
      seasonPlayed: 1,
      weekPlayed: 1,
      apiKey: 'key',
      settings,
    })

    expect(result.narrative.headline).toBe('合规标题')
    expect(mockedCall).toHaveBeenCalledTimes(2)
  })

  it('does nothing when narration is disabled', async () => {
    await expect(
      narrateWeek({
        world: setupWorld(),
        match: null,
        event: null,
        seasonPlayed: 1,
        weekPlayed: 1,
        apiKey: 'key',
        settings: { ...settings, narrativeDensity: 'off' },
      }),
    ).rejects.toBeInstanceOf(LlmError)
    expect(mockedCall).not.toHaveBeenCalled()
  })
})

describe('generateChatReply', () => {
  beforeEach(() => {
    mockedCall.mockReset()
  })

  it('returns a sanitized reply and constrained action', async () => {
    mockedCall.mockResolvedValueOnce(
      weekResult({ replyZh: ' 你点点头：<i>“我会加练。”</i> ', actionId: 'extra_training' }),
    )

    const reply = await generateChatReply({
      world: setupWorld(),
      playerMessage: '我想加练',
      apiKey: 'key',
      settings,
    })

    expect(reply.text).toBe('你点点头：“我会加练。”')
    expect(reply.actionId).toBe('extra_training')
  })

  it('retries once when the model returns an invalid action', async () => {
    mockedCall
      .mockResolvedValueOnce(weekResult({ replyZh: '好。', actionId: 'set_score' }))
      .mockResolvedValueOnce(weekResult({ replyZh: '好，去休息吧。', actionId: 'rest' }))

    const reply = await generateChatReply({
      world: setupWorld(),
      playerMessage: '我想休息',
      apiKey: 'key',
      settings,
    })

    expect(reply.actionId).toBe('rest')
    expect(mockedCall).toHaveBeenCalledTimes(2)
    expect(mockedCall.mock.calls[1]![0].user).toContain('未通过校验')
  })
})
