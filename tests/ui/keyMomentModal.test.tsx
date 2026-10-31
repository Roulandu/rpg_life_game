import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { KeyMomentModal } from '../../src/ui/screens/matchday/KeyMomentModal'
import { resolveKeyMoment } from '../../src/engine/keyMoments'
import { IDLE_PLAYBACK } from '../../src/store/livePlayback'
import { worldWithKeyMoments } from './matchdayWorld'

afterEach(() => cleanup())

describe('key moment modal', () => {
  it('等待阶段显示触发条件、5 个选项与成功率依据', () => {
    const world = worldWithKeyMoments()
    const match = world.lastMatch!
    const moment = match.keyMoments!.find((item) => !item.outcome)!

    render(
      <KeyMomentModal
        match={match}
        playback={{ ...IDLE_PLAYBACK, fixtureId: match.fixtureId, phase: 'awaiting' }}
        acting={false}
        onChoose={vi.fn()}
        onSkip={vi.fn()}
        onContinue={vi.fn()}
      />,
    )

    expect(screen.getByText(`第 ${moment.minute} 分钟 · 关键时刻`)).toBeInTheDocument()
    expect(screen.getByText(`触发条件：${moment.triggerZh}`)).toBeInTheDocument()
    expect(screen.getAllByText(/成功率/)).toHaveLength(5)
    expect(screen.getAllByText(/评分/).length).toBeGreaterThan(0)
    expect(screen.getByText(/跳过剩余回合/)).toBeInTheDocument()
  })

  it('结果阶段显示掷骰结果、影响与继续比赛', () => {
    const world = worldWithKeyMoments()
    const moment = world.lastMatch!.keyMoments!.find((item) => !item.outcome)!
    resolveKeyMoment(world, moment.id, moment.defaultOptionId, { advance: false })
    const match = world.lastMatch!
    const option = moment.options.find((item) => item.id === moment.defaultOptionId)!
    const onContinue = vi.fn()

    render(
      <KeyMomentModal
        match={match}
        playback={{
          ...IDLE_PLAYBACK,
          fixtureId: match.fixtureId,
          phase: 'result',
          resultMomentId: moment.id,
        }}
        acting={false}
        onChoose={vi.fn()}
        onSkip={vi.fn()}
        onContinue={onContinue}
      />,
    )

    expect(screen.getByText(/掷骰/)).toBeInTheDocument()
    expect(screen.getByText(/阈值 \d+%/)).toBeInTheDocument()
    expect(screen.getByText(/成功率 \d+%/)).toBeInTheDocument()
    expect(option.ratingOnSuccess).toBeTypeOf('number')
    fireEvent.click(screen.getByRole('button', { name: '继续比赛' }))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })
})
