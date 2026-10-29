import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MatchdayScreen } from '../../src/ui/screens/MatchdayScreen'
import { useGameStore } from '../../src/store/gameStore'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'
import { finalizedWorld, resolveFirstMoment, worldWithKeyMoments } from './matchdayWorld'

function renderMatchday() {
  return render(
    <MemoryRouter>
      <MatchdayScreen />
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  useGameStore.setState({
    world: null,
    saveId: null,
    saves: [],
    lastTurn: null,
    seasonTransition: null,
    busy: false,
    hydrated: true,
    notice: null,
    error: null,
  })
})

describe('matchday screen', () => {
  it('renders the pending key moment stage', () => {
    useGameStore.setState({ world: worldWithKeyMoments(), hydrated: true })
    renderMatchday()

    expect(screen.getByText('比赛日 · 关键回合')).toBeInTheDocument()
    expect(screen.getByText('轮到你做决定')).toBeInTheDocument()
    expect(screen.getByText(/关键回合 1\//)).toBeInTheDocument()
    expect(screen.getByText(/跳过剩余回合/)).toBeInTheDocument()
    expect(screen.getAllByText(/成功率/).length).toBeGreaterThan(0)
    expect(screen.queryByText('已经发生')).not.toBeInTheDocument()
  })

  it('shows resolved moments and running impact after one choice', () => {
    useGameStore.setState({ world: resolveFirstMoment(worldWithKeyMoments()), hydrated: true })
    renderMatchday()

    expect(screen.getByText('已经发生')).toBeInTheDocument()
    expect(screen.getByText('到目前为止的影响')).toBeInTheDocument()
    expect(screen.getByText(/教练信任/)).toBeInTheDocument()
  })

  it('renders the final match review', () => {
    useGameStore.setState({ world: finalizedWorld(worldWithKeyMoments()), hydrated: true })
    renderMatchday()

    expect(screen.getByText('比赛日')).toBeInTheDocument()
    expect(screen.getByText('全场结束')).toBeInTheDocument()
    expect(screen.getByText('你的表现')).toBeInTheDocument()
    expect(screen.getByText('媒体反应')).toBeInTheDocument()
    expect(screen.getByText('关键回合回顾')).toBeInTheDocument()
    expect(screen.getByText('文字直播')).toBeInTheDocument()
    expect(screen.getByText('下一场')).toBeInTheDocument()
  })

  it('renders the bench role when the user did not play', () => {
    const world = finalizedWorld(worldWithKeyMoments())
    if (world.lastMatch) {
      world.lastMatch.userPlayed = false
      world.lastMatch.userRating = null
    }
    useGameStore.setState({ world, hydrated: true })
    renderMatchday()

    expect(screen.getByText('本场没有获得出场机会')).toBeInTheDocument()
    expect(screen.queryByText('赛后评分')).not.toBeInTheDocument()
  })

  it('renders an empty state before any match', () => {
    useGameStore.setState({ world: generateWorld(testOptions(), TEST_NOW), hydrated: true })
    renderMatchday()

    expect(screen.getByText('还没有比赛记录')).toBeInTheDocument()
    expect(screen.getByText('下一场')).toBeInTheDocument()
  })
})
