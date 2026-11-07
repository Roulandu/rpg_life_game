import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import type { WorldState } from '../../src/domain/types'
import { TimelineScreen } from '../../src/ui/screens/TimelineScreen'
import { useGameStore } from '../../src/store/gameStore'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'
import { renderWithRouter } from './renderScreen'
import { resetUiStore } from './resetStore'

function worldWithHistory(): WorldState {
  const world = generateWorld(testOptions({ seed: 424242 }), TEST_NOW)
  const user = world.players[world.playerId]!
  user.history.push({
    season: 2026,
    age: 21,
    clubId: world.clubId,
    clubName: world.clubs[world.clubId]!.nameZh,
    tier: 2,
    appearances: 20,
    goals: 4,
    assists: 2,
    averageRating: 6.8,
    note: undefined,
  })
  useGameStore.setState({ world, hydrated: true })
  return world
}

afterEach(() => {
  cleanup()
  resetUiStore()
})

describe('生涯时间线的承诺口径', () => {
  it('有上赛季数据时只报事实，不替后续版本打广告', () => {
    worldWithHistory()
    renderWithRouter(<TimelineScreen />, { initialEntries: ['/timeline'] })

    expect(screen.getByText(/上赛季平均评分/)).toBeInTheDocument()
    expect(screen.queryByText(/后续版本/)).not.toBeInTheDocument()
    expect(screen.queryByText(/转会.*加入时间线/)).not.toBeInTheDocument()
  })
})
