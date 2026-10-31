import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { MatchdayScreen } from '../../src/ui/screens/MatchdayScreen'
import { DashboardScreen } from '../../src/ui/screens/DashboardScreen'
import { ScheduleScreen } from '../../src/ui/screens/ScheduleScreen'
import { useGameStore } from '../../src/store/gameStore'
import { autoResolveKeyMoments, finalizeMatchday } from '../../src/engine/keyMoments'
import { db } from '../../src/db/db'
import { playToKeyMoments } from '../fixtures/matchday'
import { renderWithRouter } from './renderScreen'
import { resetUiStore } from './resetStore'

function liveWithLaterGoals() {
  for (let seed = 2026; seed < 2080; seed += 1) {
    const { world } = playToKeyMoments(seed)
    const live = structuredClone(world)
    const liveReport = live.lastMatch!
    const finished = structuredClone(world)
    autoResolveKeyMoments(finished)
    finalizeMatchday(finished)
    if (finished.lastMatch!.goals.length > liveReport.goals.length) {
      return { world: live, live: liveReport, finalScore: `${finished.lastMatch!.homeGoals} - ${finished.lastMatch!.awayGoals}` }
    }
  }
  throw new Error('No live match with later goals found')
}

afterEach(async () => {
  cleanup()
  resetUiStore()
  await db.saves.clear()
  await db.meta.clear()
})

describe('live matchday score', () => {
  it('回归: 实时比赛页比分取当前分钟而非终场比分', () => {
    const { world, live, finalScore } = liveWithLaterGoals()
    useGameStore.setState({ world, hydrated: true })

    renderWithRouter(<MatchdayScreen />)

    const score = screen.getByTestId('score-line')
    expect(score.textContent).toBe(`${live.homeGoals} - ${live.awayGoals}`)
    expect(score.textContent).not.toBe(finalScore)
    expect(screen.getByText(`进行中 · 第 ${live.currentMinute} 分钟`)).toBeInTheDocument()
  })

  it('live 且没有待处理回合时提供完成比赛入口', async () => {
    const { world } = playToKeyMoments()
    const next = structuredClone(world)
    autoResolveKeyMoments(next)
    expect(next.lastMatch?.status).toBe('live')
    expect(next.lastMatch?.currentMinute).toBe(90)
    useGameStore.setState({ world: next, saveId: 'live-ui-save', hydrated: true })

    renderWithRouter(<MatchdayScreen />)
    const finish = screen.getByRole('button', { name: '完成比赛' })
    fireEvent.click(finish)

    await waitFor(() =>
      expect(useGameStore.getState().world?.lastMatch?.status).toBe('final'),
    )
    expect(useGameStore.getState().world?.week).toBe(next.week + 1)
  })

  it('主页 last match 显示实时比分与当前分钟', () => {
    const { world, live } = liveWithLaterGoals()
    useGameStore.setState({ world, hydrated: true, saves: [] })

    renderWithRouter(<DashboardScreen />)

    expect(screen.getByText(new RegExp(`第 ${live.currentMinute} 分钟`))).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`${live.homeGoals}-${live.awayGoals}`))).toBeInTheDocument()
  })

  it('赛程页 live 场次显示进行中与实时比分', () => {
    const { world, live } = liveWithLaterGoals()
    const fixture = world.fixtures[live.fixtureId]!
    const isHome = fixture.homeId === world.clubId
    const goalsFor = isHome ? fixture.homeGoals : fixture.awayGoals
    const goalsAgainst = isHome ? fixture.awayGoals : fixture.homeGoals
    useGameStore.setState({ world, hydrated: true, saves: [] })

    renderWithRouter(<ScheduleScreen />)

    expect(screen.getByText('进行中')).toBeInTheDocument()
    expect(screen.getByText(`${goalsFor}-${goalsAgainst}`)).toBeInTheDocument()
  })
})
