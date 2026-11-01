import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { GameEvent, WorldState } from '../../src/domain'
import { fixtureDayOf } from '../../src/domain'
import { DashboardScreen } from '../../src/ui/screens/DashboardScreen'
import { InboxScreen } from '../../src/ui/screens/InboxScreen'
import { useGameStore } from '../../src/store/gameStore'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'
import { resetUiStore } from './resetStore'

/** 主页今天区要能跳到事件处理页，所以用真实路由而不是裸 MemoryRouter。 */
function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/game']}>
      <Routes>
        <Route path="/game" element={<DashboardScreen />} />
        <Route path="/inbox" element={<InboxScreen />} />
      </Routes>
    </MemoryRouter>,
  )
}

function makeEvent(world: WorldState, title: string): GameEvent {
  const createdAtDay = (world.week - 1) * 7 + world.day
  return {
    id: `event:${world.season}:${world.week}:1:${title}`,
    templateId: 'test:today',
    title,
    body: '这是一条只需要出现在主页今天区的事件。',
    sender: '队医',
    season: world.season,
    week: world.week,
    day: world.day,
    createdAtWeek: world.week,
    createdAtDay,
    expiresWeek: world.week + 1,
    expiresDay: createdAtDay + 3,
    blocking: true,
    status: 'open',
    choices: [{ id: 'c1', label: '好的', effects: [] }],
    source: 'template',
  }
}

function setState(world: WorldState) {
  useGameStore.setState({ world, hydrated: true, saves: [] })
}

function userFixtureThisWeek(world: WorldState) {
  const fixture = Object.values(world.fixtures).find(
    (item) =>
      item.season === world.season &&
      item.week === world.week &&
      (item.homeId === world.clubId || item.awayId === world.clubId),
  )
  if (!fixture) throw new Error(`第 ${world.week} 周没有本俱乐部赛程`)
  return fixture
}

afterEach(() => {
  cleanup()
  resetUiStore()
})

describe('主页今天区', () => {
  it('训练日的今天区给出星期几与本周训练重点', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    world.day = 1
    world.weekPlan = { training: 'technical', extra: 'none' }
    setState(world)
    renderDashboard()

    expect(screen.getByText('今天')).toBeInTheDocument()
    expect(screen.getByText('训练日')).toBeInTheDocument()
    expect(screen.getByText('技术打磨')).toBeInTheDocument()
  })

  it('有待处理事件时今天区列出标题并能进入处理页', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    world.day = 1
    world.events['event:test:coach-reminder'] = makeEvent(world, '教练的提醒')
    setState(world)
    renderDashboard()

    expect(screen.getByText('教练的提醒')).toBeInTheDocument()
    expect(screen.getByText('队医 ·')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '去处理事件' }))

    expect(screen.getByText('收件箱')).toBeInTheDocument()
  })

  it('今天卡把最新一天的消息排在前面', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    world.day = 3
    world.events['event:old'] = { ...makeEvent(world, '昨天的消息'), createdAtDay: 8 }
    world.events['event:new'] = { ...makeEvent(world, '今天的消息'), createdAtDay: 17 }
    setState(world)
    renderDashboard()

    const titles = screen.getAllByText(/的消息/).map((node) => node.textContent ?? '')
    expect(titles[0]).toContain('今天的消息')
    expect(titles[1]).toContain('昨天的消息')
  })

  it('今天没有事件时给出平静日文案', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    world.day = 1
    setState(world)
    renderDashboard()

    expect(screen.getByText('今天没有需要你处理的事。')).toBeInTheDocument()
  })

  it('比赛日的今天区显示对手与主客场', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    const fixture = userFixtureThisWeek(world)
    world.day = fixtureDayOf(fixture)
    setState(world)
    renderDashboard()

    const isHome = fixture.homeId === world.clubId
    const opponent = world.clubs[isHome ? fixture.awayId : fixture.homeId]!
    expect(screen.getByText('比赛日')).toBeInTheDocument()
    expect(screen.getByText(`${isHome ? '主场' : '客场'} vs ${opponent.nameZh}`)).toBeInTheDocument()
  })
})
