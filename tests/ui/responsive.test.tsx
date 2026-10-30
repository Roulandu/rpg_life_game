import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { CreateCareerScreen } from '../../src/ui/screens/CreateCareerScreen'
import { MatchdayScreen } from '../../src/ui/screens/MatchdayScreen'
import { MoreScreen } from '../../src/ui/screens/MoreScreen'
import { SettingsScreen } from '../../src/ui/screens/SettingsScreen'
import { TitleScreen } from '../../src/ui/screens/TitleScreen'
import { useGameStore } from '../../src/store/gameStore'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'
import { renderWithRouter } from './renderScreen'
import { resetUiStore } from './resetStore'

const FOCUS_MAX = 'sm:max-w-[var(--focus-max)]'

afterEach(() => {
  cleanup()
  resetUiStore()
})

describe('focused flows', () => {
  it('centers the title screen and splits it into two columns on desktop', () => {
    const { container } = renderWithRouter(<TitleScreen />)
    const root = container.firstElementChild as HTMLElement

    expect(root.className).toContain(FOCUS_MAX)
    expect(root.className).toContain('lg:max-w-[960px]')
    expect(screen.getByTestId('title-grid').className).toContain('lg:grid')
    expect(screen.getByTestId('title-aside')).toBeInTheDocument()
  })

  it('centers career creation without restructuring the form', () => {
    const { container } = renderWithRouter(<CreateCareerScreen />)
    expect((container.firstElementChild as HTMLElement).className).toContain(FOCUS_MAX)
  })

  it('centers matchday and settings on wide screens', () => {
    useGameStore.setState({ world: generateWorld(testOptions(), TEST_NOW), hydrated: true, saves: [] })

    const matchday = renderWithRouter(<MatchdayScreen />)
    expect((matchday.container.firstElementChild as HTMLElement).className).toContain(FOCUS_MAX)
    cleanup()

    const settings = renderWithRouter(<SettingsScreen />)
    expect((settings.container.firstElementChild as HTMLElement).className).toContain(FOCUS_MAX)
  })

  it('keeps the more screen columns as two grid items in phone order', () => {
    useGameStore.setState({ world: generateWorld(testOptions(), TEST_NOW), hydrated: true, saves: [] })
    renderWithRouter(<MoreScreen />)

    const grid = screen.getByTestId('more-grid')
    expect(grid.className).toContain('lg:grid-cols-[minmax(0,1fr)_360px]')
    expect(grid.children).toHaveLength(2)
    expect(grid.children[0].textContent).toContain('生涯时间线')
    expect(grid.children[0].textContent).toContain('财务概览')
    expect(grid.children[1].textContent).toContain('最近账目')
    expect(grid.children[1].textContent).toContain('关于')
  })
})

