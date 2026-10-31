import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LiveControls } from '../../src/ui/screens/matchday/LiveControls'
import type { LivePhase, LiveSpeed } from '../../src/store/livePlayback'

interface ControlProps {
  phase: LivePhase
  speed: LiveSpeed
  onPause: () => void
  onResume: () => void
  onJump: () => void
  onSpeed: (speed: LiveSpeed) => void
}

function baseProps(overrides: Partial<ControlProps> = {}): ControlProps {
  return {
    phase: 'playing',
    speed: 2,
    onPause: vi.fn(),
    onResume: vi.fn(),
    onJump: vi.fn(),
    onSpeed: vi.fn(),
    ...overrides,
  }
}

afterEach(() => cleanup())

describe('live controls', () => {
  it('显示 1x/2x/4x 并标记当前速度档', () => {
    const props = baseProps()
    render(<LiveControls {...props} />)

    expect(screen.getByRole('button', { name: '1x' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '2x' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: '4x' }))
    expect(props.onSpeed).toHaveBeenCalledWith(4)
  })

  it('播放时显示暂停，暂停后显示继续，并可跳到下一关键回合', () => {
    const playing = baseProps()
    const { rerender } = render(<LiveControls {...playing} />)
    fireEvent.click(screen.getByRole('button', { name: '暂停' }))
    expect(playing.onPause).toHaveBeenCalledTimes(1)

    const paused = baseProps({ phase: 'paused' })
    rerender(<LiveControls {...paused} />)
    fireEvent.click(screen.getByRole('button', { name: '继续' }))
    expect(paused.onResume).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: '跳到下一关键回合' }))
    expect(paused.onJump).toHaveBeenCalledTimes(1)
  })

  it('关键回合与终场阶段禁用比赛控制', () => {
    render(<LiveControls {...baseProps({ phase: 'ended' })} />)

    expect(screen.getByRole('button', { name: '跳到下一关键回合' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: '暂停' })).not.toBeInTheDocument()
  })
})
