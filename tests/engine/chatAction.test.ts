import { describe, expect, it } from 'vitest'
import { applyChatActionProposal } from '../../src/engine/chatAction'
import { resolveChatAction } from '../../src/llm/actions'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

function freshWorld() {
  return generateWorld(testOptions(), TEST_NOW)
}

describe('applyChatActionProposal', () => {
  it('施加 talk_coach 提案效果并记录本周动作', () => {
    const world = freshWorld()
    const coach = Object.values(world.relationships).find((item) => item.role === 'coach')
    const user = world.players[world.playerId]!
    expect(coach).toBeTruthy()

    const trustBefore = coach!.trust
    const moraleBefore = user.morale
    const label = applyChatActionProposal(world, resolveChatAction(world, 'talk_coach')!)

    expect(label).toBe('与教练谈话')
    expect(coach!.trust).toBe(Math.min(100, trustBefore + 2))
    expect(user.morale).toBe(Math.min(100, moraleBefore + 1))
    expect(world.aiAction).toEqual({
      season: world.season,
      week: world.week,
      actionId: 'talk_coach',
    })
  })

  it('施加 rest 提案：体能上升、状态微降', () => {
    const world = freshWorld()
    const user = world.players[world.playerId]!
    const fitnessBefore = user.fitness
    const sharpnessBefore = user.sharpness

    const label = applyChatActionProposal(world, resolveChatAction(world, 'rest')!)

    expect(label).toBe('休息调整')
    expect(user.fitness).toBe(Math.min(100, fitnessBefore + 4))
    expect(user.sharpness).toBe(Math.max(0, sharpnessBefore - 1))
    expect(world.aiAction?.actionId).toBe('rest')
  })

  it('施加 extra_training 提案：状态上升、体能下降、教练信任上升', () => {
    const world = freshWorld()
    const user = world.players[world.playerId]!
    const coach = Object.values(world.relationships).find((item) => item.role === 'coach')!
    const sharpnessBefore = user.sharpness
    const fitnessBefore = user.fitness
    const trustBefore = coach.trust

    const label = applyChatActionProposal(world, resolveChatAction(world, 'extra_training')!)

    expect(label).toBe('主动加练')
    expect(user.sharpness).toBe(Math.min(100, sharpnessBefore + 3))
    expect(user.fitness).toBe(Math.max(0, fitnessBefore - 4))
    expect(coach.trust).toBe(Math.min(100, trustBefore + 1))
    expect(world.aiAction?.actionId).toBe('extra_training')
  })

  it('施加 media_interview 提案：媒体与球迷声望上升', () => {
    const world = freshWorld()
    const user = world.players[world.playerId]!
    const mediaBefore = user.reputation.media
    const fanBefore = user.reputation.fanbase

    const label = applyChatActionProposal(world, resolveChatAction(world, 'media_interview')!)

    expect(label).toBe('接受采访')
    expect(user.reputation.media).toBe(Math.min(100, mediaBefore + 2))
    expect(user.reputation.fanbase).toBe(Math.min(100, fanBefore + 1))
    expect(world.aiAction?.actionId).toBe('media_interview')
  })
})
