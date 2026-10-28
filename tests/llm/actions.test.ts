import { describe, expect, it } from 'vitest'
import type { ChatActionProposal } from '../../src/domain/chatAction'
import { resolveChatAction } from '../../src/llm/actions'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

describe('resolveChatAction 纯性', () => {
  it('返回提案但不修改世界状态', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    const snapshot = JSON.stringify(world)

    const proposal: ChatActionProposal | null = resolveChatAction(world, 'extra_training')

    expect(proposal).not.toBeNull()
    expect(proposal?.actionId).toBe('extra_training')
    expect(proposal?.label).toBe('主动加练')
    expect(proposal?.effects).toEqual([
      { op: 'sharpness', delta: 3 },
      { op: 'fitness', delta: -4 },
      { op: 'coachTrust', delta: 1 },
    ])
    expect(JSON.stringify(world)).toBe(snapshot)
    expect(world.aiAction).toBeUndefined()
  })

  it('本周已用过动作时返回空提案', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    world.aiAction = { season: world.season, week: world.week, actionId: 'rest' }

    expect(resolveChatAction(world, 'talk_coach')).toBeNull()
  })
})
