import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MatchStatsPanel } from '../../src/ui/screens/matchday/MatchStatsPanel'

afterEach(() => cleanup())

describe('match stats panel', () => {
  it('显示双方控球、射门、射正与角球', () => {
    render(
      <MatchStatsPanel
        homeName="主队"
        awayName="客队"
        stats={{
          home: { possession: 42, shots: 5, shotsOnTarget: 3, corners: 1 },
          away: { possession: 48, shots: 3, shotsOnTarget: 2, corners: 4 },
        }}
      />,
    )

    expect(screen.getByTestId('match-stats')).toBeInTheDocument()
    expect(screen.getByText('控球')).toBeInTheDocument()
    expect(screen.getByText('射门')).toBeInTheDocument()
    expect(screen.getByText('射正')).toBeInTheDocument()
    expect(screen.getByText('角球')).toBeInTheDocument()
    expect(screen.getByTestId('stat-home-possession')).toHaveTextContent('47%')
    expect(screen.getByTestId('stat-away-possession')).toHaveTextContent('53%')
    expect(screen.getByTestId('stat-home-shots')).toHaveTextContent('5')
    expect(screen.getByTestId('stat-away-shots')).toHaveTextContent('3')
    expect(screen.getByTestId('stat-home-shotsOnTarget')).toHaveTextContent('3')
    expect(screen.getByTestId('stat-away-corners')).toHaveTextContent('4')
  })

  it('控球为零时按 50% 显示，避免除零', () => {
    render(
      <MatchStatsPanel
        homeName="主队"
        awayName="客队"
        stats={{
          home: { possession: 0, shots: 0, shotsOnTarget: 0, corners: 0 },
          away: { possession: 0, shots: 0, shotsOnTarget: 0, corners: 0 },
        }}
      />,
    )

    expect(screen.getByTestId('stat-home-possession')).toHaveTextContent('50%')
    expect(screen.getByTestId('stat-away-possession')).toHaveTextContent('50%')
  })
})
