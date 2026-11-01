import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { GameEvent, WorldState } from '../../src/domain'
import { computeOverall } from '../../src/domain'
import { BottomNav } from '../../src/ui/components/BottomNav'
import { TeamScreen } from '../../src/ui/screens/TeamScreen'
import { useGameStore } from '../../src/store/gameStore'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'
import { resetUiStore } from './resetStore'

function withSquad(input: Partial<WorldState> = {}): WorldState {
  const world = generateWorld(testOptions(), TEST_NOW)
  return { ...world, ...input }
}

function openEvent(world: WorldState): GameEvent {
  return {
    id: `event:${world.season}:${world.week}:1:nav`,
    templateId: 'test:nav',
    title: '队医的提醒',
    body: '需要根据今天的状态处理。',
    season: world.season,
    week: world.week,
    createdAtWeek: world.week,
    expiresWeek: world.week + 1,
    status: 'open',
    choices: [{ id: 'c1', label: '知道了', effects: [] }],
    source: 'template',
  }
}

function renderNav(world: WorldState) {
  useGameStore.setState({ world, hydrated: true, saves: [] })
  return render(
    <MemoryRouter initialEntries={['/game']}>
      <BottomNav />
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  resetUiStore()
})

describe('队伍页', () => {
  it('按能力排序列出本队球员并标注位置与角色', () => {
    const world = withSquad()
    useGameStore.setState({ world, hydrated: true, saves: [] })
    render(<TeamScreen />)

    const squad = world.clubs[world.clubId].squadIds.map((id) => world.players[id])
    const top = [...squad]
      .sort((a, b) => computeOverall(b.position, b.attributes) - computeOverall(a.position, a.attributes))
      [0]!

    expect(screen.getByText('队伍')).toBeInTheDocument()
    expect(screen.getByText(world.clubs[world.clubId].nameZh)).toBeInTheDocument()
    expect(screen.getByText(top.name)).toBeInTheDocument()
    expect(screen.getAllByText(/主力|轮换|核心|青训|你/).length).toBeGreaterThan(0)
  })

  it('伤停的队友给出预计缺阵天数', () => {
    const world = withSquad()
    const teammateId = world.clubs[world.clubId].squadIds.find((id) => id !== world.playerId)!
    world.players[teammateId]!.injury = { kind: '大腿后侧拉伤', daysLeft: 14, severity: 2 }
    useGameStore.setState({ world, hydrated: true, saves: [] })
    render(<TeamScreen />)

    expect(screen.getByText(/预计缺阵 14 天/)).toBeInTheDocument()
  })

  it('教练卡显示教练与执教评分', () => {
    const world = withSquad()
    useGameStore.setState({ world, hydrated: true, saves: [] })
    render(<TeamScreen />)

    const coach = world.clubs[world.clubId].coach
    expect(screen.getByText('教练组')).toBeInTheDocument()
    expect(screen.getByText(coach.name)).toBeInTheDocument()
    expect(screen.getByText(`${coach.quality}`)).toBeInTheDocument()
  })
})

describe('底部导航第三槽', () => {
  it('换成队伍入口，不再直接暴露收件箱', () => {
    renderNav(withSquad())

    expect(screen.getByRole('link', { name: /队伍/ })).toHaveAttribute('href', '/team')
    expect(screen.queryByRole('link', { name: /收件箱/ })).toBeNull()
  })

  it('有未处理事件时徽标挂在主页槽', () => {
    const world = withSquad()
    world.events['event:test:nav'] = openEvent(world)
    renderNav(world)

    const home = screen.getByRole('link', { name: /主页/ })
    expect(home).toContainElement(screen.getByText('1'))
    expect(screen.queryByRole('link', { name: /收件箱/ })).toBeNull()
  })
})
