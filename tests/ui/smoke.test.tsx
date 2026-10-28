import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DashboardScreen } from '../../src/ui/screens/DashboardScreen'
import { TitleScreen } from '../../src/ui/screens/TitleScreen'
import { useGameStore } from '../../src/store/gameStore'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

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

describe('ui smoke tests', () => {
  it('renders the title screen without a save', () => {
    render(
      <MemoryRouter>
        <TitleScreen />
      </MemoryRouter>,
    )
    expect(screen.getByText('绿茵人生')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /新建生涯/ })).toBeInTheDocument()
  })

  it('renders the dashboard for an active career', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    useGameStore.setState({ world, hydrated: true, saves: [] })
    render(
      <MemoryRouter>
        <DashboardScreen />
      </MemoryRouter>,
    )
    expect(screen.getAllByText('伯明翰联').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/测试球员/).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /安排并推进第 1 周/ })).toBeInTheDocument()
    expect(screen.getByText('联赛排名')).toBeInTheDocument()
    expect(screen.getByText('积分')).toBeInTheDocument()
  })
})
