import { beforeEach, describe, expect, it } from 'vitest'
import { TRAINING_LABELS } from '../../src/domain'
import { listSaves } from '../../src/db/repository'
import { useGameStore } from '../../src/store/gameStore'
import { testOptions } from '../fixtures/career'
import { clearStore } from '../fixtures/storeHarness'

describe('逐日推进的 store', () => {
  beforeEach(clearStore)

  /**
   * 每日事件也会成为快进停点，所以「停在比赛日」要按玩家的方式连点：
   * 每次停下处理完那一天，再推进，直到停在开球那天。
   */
  async function fastForwardToMatchday() {
    let fast = await useGameStore.getState().advanceToNextEvent()
    for (let round = 0; round < 8 && fast?.stopReason !== 'matchday'; round += 1) {
      fast = await useGameStore.getState().advanceToNextEvent()
    }
    return fast
  }

  it('推进一天只让日时钟加一天并落盘', async () => {
    await useGameStore.getState().createCareer(testOptions())
    expect(useGameStore.getState().world?.day).toBe(1)

    const result = await useGameStore.getState().advanceDay()

    expect(result?.dayPlayed).toBe(1)
    expect(useGameStore.getState().world?.day).toBe(2)
    expect(useGameStore.getState().world?.week).toBe(1)
    expect(await listSaves()).toHaveLength(1)
  })

  it('推进到下一件事停在比赛日并汇总平静日', async () => {
    await useGameStore.getState().createCareer(testOptions())

    const fast = await fastForwardToMatchday()

    const world = useGameStore.getState().world
    expect(fast?.stopReason).toBe('matchday')
    expect(world?.day).toBe(7)
    expect(world?.lastMatch?.status).toBe('live')
    expect(useGameStore.getState().notice).toContain('个平静日')
  })

  it('保存本周安排只写周计划，不推进时钟', async () => {
    await useGameStore.getState().createCareer(testOptions())

    const ok = await useGameStore.getState().setWeekPlan({ training: 'physical', extra: 'media' })

    const world = useGameStore.getState().world
    expect(ok).toBe(true)
    expect(world?.weekPlan).toEqual({ training: 'physical', extra: 'media' })
    expect(world?.day).toBe(1)
    expect(world?.week).toBe(1)
  })

  it('今天的比赛没踢完时拒绝继续往后推日子', async () => {
    await useGameStore.getState().createCareer(testOptions())
    await fastForwardToMatchday()

    const blocked = await useGameStore.getState().advanceDay()

    expect(blocked).toBeNull()
    expect(useGameStore.getState().error).toContain('请先')
    expect(useGameStore.getState().world?.day).toBe(7)
  })

  it('推进摘要说出这一天是训练日、活动日还是休息日', async () => {
    await useGameStore.getState().createCareer(testOptions())
    const focus = useGameStore.getState().world?.weekPlan.training ?? 'technical'

    const notices: string[] = []
    for (let index = 0; index < 6; index += 1) {
      await useGameStore.getState().advanceDay()
      notices.push(useGameStore.getState().notice ?? '')
    }

    expect(notices[0]).toBe(`周一 · 训练日：${TRAINING_LABELS[focus]}`)
    expect(notices[1]).toContain('训练日')
    expect(notices[4]).toBe('周五 · 活动日')
    expect(notices[5]).toBe('周六 · 休息日')
  })
})
