import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { displayName, positionGroup } from '../../src/domain'
import { PitchMap } from '../../src/ui/screens/matchday/PitchMap'
import { IDLE_PLAYBACK } from '../../src/store/livePlayback'
import type { LivePlayback } from '../../src/store/livePlayback'
import { worldWithKeyMoments } from './matchdayWorld'

function playbackWith(patch: Partial<LivePlayback>): LivePlayback {
  return { ...IDLE_PLAYBACK, phase: 'playing', ...patch }
}

afterEach(() => cleanup())

describe('pitch map players', () => {
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
})

describe('pitch map markings', () => {
  it('绘制完整球场线：球门、禁区、小禁区、点球点与角球弧', () => {
    const world = worldWithKeyMoments()
    const match = world.lastMatch!

    render(<PitchMap world={world} match={match} playback={playbackWith({ fixtureId: match.fixtureId })} />)

    expect(screen.getByTestId('pitch-svg')).toBeInTheDocument()
    expect(screen.getByTestId('pitch-goal-home')).toBeInTheDocument()
    expect(screen.getByTestId('pitch-goal-away')).toBeInTheDocument()
    expect(screen.getByTestId('pitch-box-home')).toBeInTheDocument()
    expect(screen.getByTestId('pitch-box-away')).toBeInTheDocument()
    expect(screen.getByTestId('pitch-six-home')).toBeInTheDocument()
    expect(screen.getByTestId('pitch-six-away')).toBeInTheDocument()
    expect(screen.getByTestId('pitch-spot-home')).toBeInTheDocument()
    expect(screen.getByTestId('pitch-spot-away')).toBeInTheDocument()
    expect(screen.getAllByTestId('pitch-corner').length).toBeGreaterThanOrEqual(4)
  })
})

describe('pitch map ball', () => {
  it('足球使用 SVG 图标，且球贴在持球人脚下', () => {
    const world = worldWithKeyMoments()
    const match = world.lastMatch!
    const carrier = match.lineups!.home.find(
      (player) => positionGroup(player.position) === 'FWD',
    )!

    render(
      <PitchMap
        world={world}
        match={match}
        playback={playbackWith({
          fixtureId: match.fixtureId,
          possession: 'home',
          ballX: 0.72,
          carrierId: carrier.id,
        })}
      />,
    )

    const ball = screen.getByTestId('pitch-ball')
    const carrierDot = [...screen.getAllByTestId('pitch-player')].find(
      (player) => player.getAttribute('data-player-id') === carrier.id,
    )!
    expect(ball.querySelector('svg')).not.toBeNull()
    expect(screen.getByTestId('pitch-ball-icon')).toBeInTheDocument()
    expect(Math.abs(parseFloat(ball.style.left) - parseFloat(carrierDot.style.left))).toBeLessThan(2)
    expect(Math.abs(parseFloat(ball.style.top) - parseFloat(carrierDot.style.top))).toBeLessThan(2)
  })
})

describe('pitch map anchors', () => {
  it('球员圆点的锚点居中，姓名与号码向下挂载', () => {
    const world = worldWithKeyMoments()
    const match = world.lastMatch!
    render(<PitchMap world={world} match={match} playback={playbackWith({ fixtureId: match.fixtureId })} />)

    const player = screen.getAllByTestId('pitch-player')[0]!
    const dot = within(player).getByTestId('pitch-player-dot')

    expect(player.className).not.toContain('-translate-x-1/2')
    expect(dot.className).toContain('-translate-x-1/2')
    expect(dot.className).toContain('-translate-y-1/2')
  })
})

describe('pitch map passing', () => {
  it('渲染传球线、控球说明条与最近四帧轨迹', () => {
    const world = worldWithKeyMoments()
    const match = world.lastMatch!
    const carrier = match.lineups!.home.find(
      (player) => positionGroup(player.position) === 'FWD',
    )!
    const minute = match.currentMinute

    render(
      <PitchMap
        world={world}
        match={match}
        playback={playbackWith({
          fixtureId: match.fixtureId,
          possession: 'home',
          ballX: 0.6,
          carrierId: carrier.id,
          history: [
            { minute: minute - 3, possession: 'home', ballX: 0.45 },
            { minute: minute - 2, possession: 'home', ballX: 0.5 },
          ],
        })}
      />,
    )

    expect(screen.getAllByTestId('pitch-trail')).toHaveLength(2)
    expect(screen.getByTestId('pitch-pass-line').querySelector('polyline')).not.toBeNull()
    const bar = screen.getByTestId('pitch-possession')
    expect(bar.textContent).toContain(match.homeName)
    expect(bar.textContent).toContain(displayName(carrier))
  })
})

describe('pitch map goal', () => {
  it('进球分钟显示 GOAL 徽标', () => {
    const world = worldWithKeyMoments()
    const match = structuredClone(world.lastMatch!)
    match.events.push({
      minute: match.currentMinute,
      type: 'goal',
      side: 'home',
      text: '进球',
    })

    render(
      <PitchMap
        world={world}
        match={match}
        playback={playbackWith({ fixtureId: match.fixtureId, ballX: 0.96 })}
      />,
    )

    expect(screen.getByTestId('pitch-goal')).toHaveTextContent('GOAL')
  })
})

describe('pitch map animation speed', () => {
  it('动画时长随 1x/2x/4x 速度切换', () => {
    const world = worldWithKeyMoments()
    const match = world.lastMatch!
    const expected = new Map([
      [1, '420ms'],
      [2, '200ms'],
      [4, '90ms'],
    ])

    for (const [speed, duration] of expected) {
      const { unmount } = render(
        <PitchMap
          world={world}
          match={match}
          playback={playbackWith({ fixtureId: match.fixtureId, speed: speed as 1 | 2 | 4 })}
        />,
      )
      expect(
        screen.getByTestId('pitch-map').style.getPropertyValue('--pitch-move'),
      ).toBe(duration)
      unmount()
    }
  })
})

describe('pitch map responsive labels', () => {
  it('小屏用 hidden sm:block 隐藏球员姓名，桌面显示姓名与号码', () => {
    const world = worldWithKeyMoments()
    const match = world.lastMatch!
    render(
      <PitchMap world={world} match={match} playback={playbackWith({ fixtureId: match.fixtureId })} />,
    )

    const first = match.lineups!.home[0]!
    const name = screen.getByText(displayName(first))
    expect(name.className).toContain('hidden')
    expect(name.className).toContain('sm:block')
    // 直播画面的人名一律中文，不残留拉丁原名。
    expect(/[A-Za-z]/.test(displayName(first))).toBe(false)
    expect(screen.getAllByText(String(first.number)).length).toBeGreaterThan(0)
  })
})
