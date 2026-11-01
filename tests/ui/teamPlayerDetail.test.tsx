import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ATTR_KEYS, ATTR_LABELS, POSITION_LABELS } from '../../src/domain'
import type { Player } from '../../src/domain'
import { useGameStore } from '../../src/store/gameStore'
import { generateWorld } from '../../src/world/generator'
import { TeamPlayerScreen } from '../../src/ui/screens/TeamPlayerScreen'
import { TEST_NOW, testOptions } from '../fixtures/career'

const world = generateWorld(testOptions({ seed: 2026 }), TEST_NOW)

function teammate(): Player {
  const club = world.clubs[world.clubId]
  const id = club.squadIds.find((id) => id !== world.playerId)!
  return world.players[id]
}

function renderDetail(player: Player) {
  useGameStore.setState({ world, hydrated: true, saves: [] })
  return render(
    <MemoryRouter initialEntries={[`/team/${player.id}`]}>
      <Routes>
        <Route path="/team/:playerId" element={<TeamPlayerScreen />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => cleanup())

describe('队友详情页', () => {
  it('用中文名做标题，拉丁原名只作为次要信息出现', () => {
    const player = teammate()
    renderDetail(player)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(player.nameZh)
    if (player.name !== player.nameZh) expect(screen.getByText(player.name)).toBeInTheDocument()
  })

  it('十项属性、状态条与赛季数据一并列出', () => {
    const player = teammate()
    renderDetail(player)

    for (const key of ATTR_KEYS) {
      expect(screen.getByText(ATTR_LABELS[key])).toBeInTheDocument()
    }
    expect(screen.getByText(/能力\s/)).toBeInTheDocument()
    expect(screen.getByText(/潜力/)).toBeInTheDocument()
    expect(screen.getByText(POSITION_LABELS[player.position])).toBeInTheDocument()
  })

  it('写清这名球员与主教练打法的契合度，让玩家知道竞争从哪来', () => {
    const player = teammate()
    const club = world.clubs[world.clubId]
    renderDetail(player)

    expect(screen.getByText(/风格(契合|中性|不合)/)).toBeInTheDocument()
    expect(screen.getAllByText(/打法/).length).toBeGreaterThan(0)
    expect(screen.getByText(/主教练：/)).toHaveTextContent(club.coach.nameZh)
  })

  it('陌生 id 给出可读的空态而不是崩溃', () => {
    useGameStore.setState({ world, hydrated: true, saves: [] })
    render(
      <MemoryRouter initialEntries={['/team/player:not-exist']}>
        <Routes>
          <Route path="/team/:playerId" element={<TeamPlayerScreen />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText(/找不到/)).toBeInTheDocument()
  })
})
