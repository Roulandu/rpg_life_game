import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { DashboardScreen } from '../../src/ui/screens/DashboardScreen'
import { InboxScreen } from '../../src/ui/screens/InboxScreen'
import { ScheduleScreen } from '../../src/ui/screens/ScheduleScreen'
import { TitleScreen } from '../../src/ui/screens/TitleScreen'
import { useGameStore } from '../../src/store/gameStore'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'
import { finalizedWorld, worldWithKeyMoments } from './matchdayWorld'
import { renderWithRouter } from './renderScreen'
import { resetUiStore } from './resetStore'

function renderDashboard() {
  return renderWithRouter(<DashboardScreen />)
}

afterEach(() => {
  cleanup()
  resetUiStore()
})

describe('ui smoke tests', () => {
  it('renders the title screen without a save', () => {
    renderWithRouter(<TitleScreen />)
    expect(screen.getByText('绿茵人生')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /新建生涯/ })).toBeInTheDocument()
  })

  it('renders the dashboard for an active career', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    useGameStore.setState({ world, hydrated: true, saves: [] })
    renderDashboard()
    expect(screen.getAllByText('伯明翰联').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/测试球员/).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /安排并推进第 1 周/ })).toBeInTheDocument()
    expect(screen.getByText('联赛排名')).toBeInTheDocument()
    expect(screen.getByText('积分')).toBeInTheDocument()
  })
})

describe('dashboard panels', () => {
  it('links to the pending matchday from the dashboard', () => {
    useGameStore.setState({ world: worldWithKeyMoments(), hydrated: true, saves: [] })
    renderDashboard()

    expect(screen.getByText('比赛日进行中')).toBeInTheDocument()
    expect(screen.getByText('等待你做出关键回合的选择')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /继续比赛日/ })).toBeInTheDocument()
  })

  it('shows the GM narrative after a completed week', () => {
    const world = finalizedWorld(worldWithKeyMoments())
    world.aiNarrative = {
      season: world.season,
      week: world.week,
      headline: '更衣室里的低语',
      body: '教练在训练后把你叫到一边。',
      npcNote: '队友们对你点头。',
      suggestedAction: '和队友聊聊',
      createdAt: TEST_NOW,
    }
    useGameStore.setState({ world, hydrated: true, saves: [] })
    renderDashboard()

    expect(screen.getByText('本周 GM')).toBeInTheDocument()
    expect(screen.getByText('更衣室里的低语')).toBeInTheDocument()
    expect(screen.getByText('队友们对你点头。')).toBeInTheDocument()
    expect(screen.getByText(/可尝试：和队友聊聊/)).toBeInTheDocument()
  })

  it('shows AI progress and error states', () => {
    const world = finalizedWorld(worldWithKeyMoments())
    useGameStore.setState({ world, hydrated: true, saves: [], aiBusy: true })
    renderDashboard()
    expect(screen.getByText(/GM 正在撰写这周的故事/)).toBeInTheDocument()
    cleanup()

    useGameStore.setState({ aiBusy: false, aiError: '连接超时' })
    renderDashboard()
    expect(screen.getByText('连接超时')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '知道了' })).toBeInTheDocument()
  })

  it('shows the retirement call to action', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    world.retired = true
    useGameStore.setState({ world, hydrated: true, saves: [] })
    renderDashboard()

    expect(screen.getByText('你已经挂靴')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /查看生涯时间线/ })).toBeInTheDocument()
  })
})

describe('dashboard navigation', () => {
  it('continues into the chat tab after the weekly narrative', () => {
    const world = finalizedWorld(worldWithKeyMoments())
    world.settings.aiMode = 'llm'
    world.aiNarrative = {
      season: world.season,
      week: world.week,
      headline: '更衣室里的低语',
      body: '教练在训练后把你叫到一边。',
      npcNote: '队友们对你点头。',
      suggestedAction: '和队友聊聊',
      createdAt: TEST_NOW,
    }
    useGameStore.setState({ world, hydrated: true, saves: [], aiKeyReady: true })
    render(
      <MemoryRouter initialEntries={['/game']}>
        <Routes>
          <Route path="/game" element={<DashboardScreen />} />
          <Route path="/inbox" element={<InboxScreen />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: '继续对话' }))

    expect(screen.getByLabelText('对 GM 说')).toBeInTheDocument()
  })
})

describe('schedule smoke', () => {
  it('renders the schedule screen for an active career', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    useGameStore.setState({ world, hydrated: true, saves: [] })
    renderWithRouter(<ScheduleScreen />)
    expect(screen.getByText('赛程与联赛')).toBeInTheDocument()
    expect(screen.getByText('全部赛程')).toBeInTheDocument()
    expect(screen.getByText(/0 \/ 38 已赛/)).toBeInTheDocument()
  })
})
