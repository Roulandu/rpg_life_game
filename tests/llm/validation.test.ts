import { describe, expect, it } from 'vitest'
import { generateWorld } from '../../src/world/generator'
import { applyChatAction, actionLabelFor, actionUsedThisWeek } from '../../src/llm/actions'
import { addUsage, estimateCostUsd } from '../../src/llm/cost'
import { SUBMIT_ACTION_SCHEMA, SUBMIT_WEEK_SCHEMA, sanitizeText } from '../../src/llm/schema'
import { TEST_NOW, testOptions } from '../fixtures/career'

describe('LLM output sanitizing', () => {
  it('strips control characters, html and links', () => {
    const text = sanitizeText('  你\u0000好 <b>教练</b> https://example.com 说了 www.test.com 一句  ', 80)
    expect(text).toBe('你 好 教练 说了 一句')
  })

  it('collapses whitespace and truncates', () => {
    expect(sanitizeText('第一行\n\n第二行', 80)).toBe('第一行 第二行')
    expect(sanitizeText('abcdef', 3)).toBe('abc')
  })
})

describe('structured output schemas', () => {
  it('accepts a valid week submission', () => {
    const parsed = SUBMIT_WEEK_SCHEMA.parse({
      headlineZh: '周末的雨',
      narrativeZh: '你在雨里完成了加练。',
      npcNoteZh: '教练看了你一眼。',
      suggestedActionZh: '找教练谈谈',
      event: { templateId: 'event:media', titleZh: '采访', bodyZh: '记者在等你。' },
    })
    expect(parsed.event?.templateId).toBe('event:media')
  })

  it('rejects overlong headlines and empty narration', () => {
    expect(() =>
      SUBMIT_WEEK_SCHEMA.parse({ headlineZh: '一'.repeat(25), narrativeZh: '正文' }),
    ).toThrow()
    expect(() => SUBMIT_WEEK_SCHEMA.parse({ headlineZh: '标题', narrativeZh: '' })).toThrow()
  })

  it('only allows the fixed chat actions', () => {
    expect(SUBMIT_ACTION_SCHEMA.parse({ replyZh: '好。', actionId: 'rest' }).actionId).toBe('rest')
    expect(() =>
      SUBMIT_ACTION_SCHEMA.parse({ replyZh: '好。', actionId: 'set_score' }),
    ).toThrow()
  })
})

describe('chat actions', () => {
  it('applies a fixed effect once per week', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    const coach = Object.values(world.relationships).find((item) => item.role === 'coach')
    const user = world.players[world.playerId]!
    expect(coach).toBeTruthy()

    const trustBefore = coach!.trust
    const moraleBefore = user.morale
    const label = applyChatAction(world, 'talk_coach')

    expect(label).toBe('与教练谈话')
    expect(coach!.trust).toBe(Math.min(100, trustBefore + 2))
    expect(user.morale).toBe(Math.min(100, moraleBefore + 1))
    expect(actionUsedThisWeek(world)).toBe(true)

    const afterFirst = coach!.trust
    expect(applyChatAction(world, 'rest')).toBeNull()
    expect(coach!.trust).toBe(afterFirst)

    world.week += 1
    expect(actionUsedThisWeek(world)).toBe(false)
    expect(applyChatAction(world, 'rest')).toBe('休息调整')
  })

  it('never applies effects for none and exposes labels', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    expect(applyChatAction(world, 'none')).toBeNull()
    expect(world.aiAction).toBeUndefined()
    expect(actionLabelFor('extra_training')).toBe('主动加练')
    expect(actionLabelFor(undefined)).toBeNull()
  })
})

describe('cost estimates', () => {
  it('uses model price patterns and a conservative default', () => {
    const usage = { promptTokens: 1_000_000, completionTokens: 1_000_000 }
    expect(estimateCostUsd('claude-sonnet-4-5', usage)).toBeCloseTo(18)
    expect(estimateCostUsd('gpt-4.1-mini', usage)).toBeCloseTo(2)
    expect(estimateCostUsd('some-unknown-model', usage)).toBeCloseTo(4)
  })

  it('accumulates calls and rounds to micro-dollars', () => {
    const first = addUsage(undefined, 'gpt-4.1-mini', {
      promptTokens: 1000,
      completionTokens: 500,
    })
    const second = addUsage(first, 'gpt-4.1-mini', {
      promptTokens: 1000,
      completionTokens: 500,
    })
    expect(second.calls).toBe(2)
    expect(second.promptTokens).toBe(2000)
    expect(second.completionTokens).toBe(1000)
    expect(second.costUsd).toBeCloseTo(0.0024)
  })
})
