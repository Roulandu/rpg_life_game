import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MatchdayScreen } from '../../src/ui/screens/MatchdayScreen'
import { useGameStore } from '../../src/store/gameStore'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'
import { finalizedWorld, resolveFirstMoment, worldWithKeyMoments } from './matchdayWorld'
import { renderWithRouter } from './renderScreen'
import { resetUiStore } from './resetStore'

function renderMatchday() {
  return renderWithRouter(<MatchdayScreen />)
}

function renderMatchdayRoute() {
  return render(
    <MemoryRouter initialEntries={['/match']}>
      <Routes>
        <Route path="/match" element={<MatchdayScreen />} />
        <Route path="/game" element={<p>主页占位</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  resetUiStore()
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
    expect(screen.getByText(/下一场：第/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /下一场/ })).not.toBeInTheDocument()
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
    expect(screen.queryByRole('button', { name: '返回主页' })).not.toBeInTheDocument()
  })
})

describe('matchday exit', () => {
  it('回归: 比赛结束后在结果页底部显示返回主页主按钮', () => {
    useGameStore.setState({ world: finalizedWorld(worldWithKeyMoments()), hydrated: true })
    renderMatchday()

    expect(screen.getByRole('button', { name: '返回主页' })).toHaveClass('btn-primary')
  })

  it('回归: 点击返回主页回到主页', () => {
    useGameStore.setState({ world: finalizedWorld(worldWithKeyMoments()), hydrated: true })
    renderMatchdayRoute()

    fireEvent.click(screen.getByRole('button', { name: '返回主页' }))

    expect(screen.getByText('主页占位')).toBeInTheDocument()
  })

  it('回归: 关键回合未完成时不显示返回主页按钮', () => {
    useGameStore.setState({ world: worldWithKeyMoments(), hydrated: true })
    renderMatchday()

    expect(screen.queryByRole('button', { name: '返回主页' })).not.toBeInTheDocument()
  })

  it('回归: 没有下一场时仍显示返回主页按钮', () => {
    const world = finalizedWorld(worldWithKeyMoments())
    Object.values(world.fixtures).forEach((fixture) => {
      fixture.status = 'played'
    })
    useGameStore.setState({ world, hydrated: true })
    renderMatchday()

    expect(screen.getByRole('button', { name: '返回主页' })).toBeInTheDocument()
    expect(screen.queryByText(/下一场：/)).not.toBeInTheDocument()
  })
})

describe('matchday navigation guard', () => {
  it('hides the next fixture link while a key moment is pending', () => {
    useGameStore.setState({ world: worldWithKeyMoments(), hydrated: true })
    renderMatchday()

    expect(screen.queryByText('下一场')).not.toBeInTheDocument()
  })
})
