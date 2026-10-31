import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { PitchMap } from '../../src/ui/screens/matchday/PitchMap'
import { IDLE_PLAYBACK } from '../../src/store/livePlayback'
import type { LivePlayback } from '../../src/store/livePlayback'
import { worldWithKeyMoments } from './matchdayWorld'

function playbackWith(patch: Partial<LivePlayback>): LivePlayback {
  return { ...IDLE_PLAYBACK, phase: 'playing', ...patch }
}

afterEach(() => cleanup())

describe('pitch map', () => {
  it('渲染双方 22 名球员、足球与控球方高亮', () => {
    const world = worldWithKeyMoments()
    const match = world.lastMatch!

    render(
      <PitchMap
        world={world}
        match={match}
        playback={playbackWith({ fixtureId: match.fixtureId, possession: 'home' })}
      />,
    )

    expect(screen.getAllByTestId('pitch-player')).toHaveLength(22)
    expect(screen.getByTestId('pitch-ball')).toBeInTheDocument()
    expect(screen.getByTestId('pitch-map')).toHaveAttribute('data-possession', 'home')
    expect(screen.getByTestId('pitch-map').querySelector('[data-side="home"]')).not.toBeNull()
    expect(screen.getByTestId('pitch-map').querySelector('[data-side="away"]')).not.toBeNull()
  })

  it('球权在客队时足球位于主队半场并绘制轨迹', () => {
    const world = worldWithKeyMoments()
    const match = world.lastMatch!
    const minute = match.currentMinute

    render(
      <PitchMap
        world={world}
        match={match}
        playback={playbackWith({
          fixtureId: match.fixtureId,
          possession: 'away',
          ballX: 0.22,
          history: [
            { minute: minute - 2, possession: 'home', ballX: 0.6 },
            { minute: minute - 1, possession: 'away', ballX: 0.4 },
          ],
        })}
      />,
    )

    expect(screen.getByTestId('pitch-ball').style.left).toBe('22%')
    expect(screen.getAllByTestId('pitch-trail')).toHaveLength(2)
  })

  it('小屏用 hidden sm:block 隐藏球员姓名，桌面显示姓名与号码', () => {
    const world = worldWithKeyMoments()
    const match = world.lastMatch!
    render(
      <PitchMap world={world} match={match} playback={playbackWith({ fixtureId: match.fixtureId })} />,
    )

    const name = screen.getByText(match.lineups!.home[0]!.name)
    expect(name.className).toContain('hidden')
    expect(name.className).toContain('sm:block')
    expect(screen.getAllByText(String(match.lineups!.home[0]!.number)).length).toBeGreaterThan(0)
  })
})
