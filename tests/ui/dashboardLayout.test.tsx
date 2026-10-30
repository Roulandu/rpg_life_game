import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { DashboardScreen } from '../../src/ui/screens/DashboardScreen'
import { useGameStore } from '../../src/store/gameStore'
import { renderWithRouter } from './renderScreen'
import { resetUiStore } from './resetStore'
import { worldWithKeyMoments } from './matchdayWorld'

afterEach(() => {
  cleanup()
  resetUiStore()
})

function blockOrder(root: Element): string[] {
  return Array.from(root.querySelectorAll('[data-dashboard-block]')).map(
    (element) => element.getAttribute('data-dashboard-block') ?? '',
  )
}

describe('dashboard responsive layout', () => {
  it('keeps the mobile block order and groups widgets into main and side columns', () => {
    useGameStore.setState({ world: worldWithKeyMoments(), hydrated: true, saves: [] })
    renderWithRouter(<DashboardScreen />)

    expect(blockOrder(document.body)).toEqual([
      'header',
      'last',
      'week',
      'next',
      'advance',
      'form',
      'league',
      'inbox',
      'news',
      'footer',
    ])
    expect(blockOrder(screen.getByTestId('dashboard-main'))).toEqual(['last', 'week', 'next', 'advance'])
    expect(blockOrder(screen.getByTestId('dashboard-side'))).toEqual(['form', 'league', 'inbox', 'news'])
  })
})
