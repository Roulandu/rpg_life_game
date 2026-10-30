import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { GameLayout } from '../../src/app/GameLayout'
import { useGameStore } from '../../src/store/gameStore'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'
import { resetUiStore } from './resetStore'

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/game']}>
      <Routes>
        <Route element={<GameLayout />}>
          <Route path="/game" element={<p>仪表盘内容</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  resetUiStore()
})

describe('responsive shell', () => {
  it('renders a single navigation inside a semantic main', () => {
    useGameStore.setState({ world: generateWorld(testOptions(), TEST_NOW), hydrated: true, saves: [] })
    const { container } = renderLayout()

    expect(screen.getByText('仪表盘内容')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getAllByRole('navigation', { name: '主导航' })).toHaveLength(1)
    expect(container.querySelector('.game-shell')).not.toBeNull()
  })

  it('declares desktop sidebar contracts on the shell and nav', () => {
    useGameStore.setState({ world: generateWorld(testOptions(), TEST_NOW), hydrated: true, saves: [] })
    renderLayout()

    const shell = document.querySelector('.app-shell') as HTMLElement
    const nav = screen.getByRole('navigation', { name: '主导航' })
    const navItems = nav.firstElementChild as HTMLElement

    expect(shell.className).toContain('game-shell')
    expect(shell.className).toContain('lg:pb-0')
    expect(nav.className).toContain('lg:w-[var(--sidenav-w)]')
    expect(nav.className).toContain('lg:translate-x-0')
    expect(navItems.className).toContain('lg:flex-col')
  })
})
