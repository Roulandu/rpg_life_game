import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { Fixture } from '../../src/domain'
import { FixtureListCard } from '../../src/ui/screens/schedule/FixtureListCard'
import { MatchReview } from '../../src/ui/screens/matchday/MatchReview'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'
import { finalizedWorld, worldWithKeyMoments } from './matchdayWorld'

function fixture(input: {
  id: string
  status: Fixture['status']
  week: number
  homeId: string
  awayId: string
  homeGoals?: number
  awayGoals?: number
}): Fixture {
  return {
    id: input.id,
    competitionId: 'league:ENG:1',
    season: 2026,
    week: input.week,
    round: input.week,
    homeId: input.homeId,
    awayId: input.awayId,
    status: input.status,
    homeGoals: input.homeGoals,
    awayGoals: input.awayGoals,
  }
}

function outcomeFixtures(homeId: string, opponentIds: string[], week: number): Fixture[] {
  const [first, second, third, fourth] = opponentIds
  return [
    fixture({ id: 'played-win', status: 'played', week: 1, homeId, awayId: first!, homeGoals: 2, awayGoals: 0 }),
    fixture({ id: 'played-draw', status: 'played', week: 2, homeId, awayId: second!, homeGoals: 1, awayGoals: 1 }),
    fixture({ id: 'played-loss', status: 'played', week: 3, homeId, awayId: third!, homeGoals: 0, awayGoals: 2 }),
    fixture({ id: 'live', status: 'live', week, homeId, awayId: fourth!, homeGoals: 1, awayGoals: 0 }),
    fixture({ id: 'scheduled-current', status: 'scheduled', week, homeId, awayId: first! }),
    fixture({ id: 'scheduled-future', status: 'scheduled', week: week + 1, homeId, awayId: second! }),
    fixture({ id: 'unknown-opponent', status: 'scheduled', week: week + 2, homeId, awayId: 'club:missing' }),
  ]
}

afterEach(() => {
  cleanup()
})

describe('fixture list outcomes', () => {
  it('renders played, live, current and future fixtures', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    const club = world.clubs[world.clubId]!
    const opponentIds = Object.values(world.clubs)
      .filter((item) => item.id !== club.id && item.leagueId === club.leagueId)
      .slice(0, 4)
      .map((item) => item.id)
    const fixtures = outcomeFixtures(club.id, opponentIds, world.week)

    render(<FixtureListCard world={world} club={club} fixtures={fixtures} />)

    expect(screen.getByText('3 / 7 已赛')).toBeInTheDocument()
    expect(screen.getByText('2-0')).toBeInTheDocument()
    expect(screen.getByText('1-1')).toBeInTheDocument()
    expect(screen.getByText('0-2')).toBeInTheDocument()
    expect(screen.getByText('进行中')).toBeInTheDocument()
    expect(screen.getByText('本周')).toBeInTheDocument()
    expect(screen.getAllByText('未赛')).toHaveLength(2)
    expect(screen.getByText('未知球队')).toBeInTheDocument()
    expect(screen.getAllByText('胜')).toHaveLength(1)
    expect(screen.getAllByText('平')).toHaveLength(1)
    expect(screen.getAllByText('负')).toHaveLength(1)
  })
})

describe('match review guards', () => {
  it('renders nothing while the report is still live', () => {
    const world = worldWithKeyMoments()
    const { container } = render(
      <MatchReview world={world} club={world.clubs[world.clubId]!} match={world.lastMatch!} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('skips optional sections and falls back to the club stadium', () => {
    const world = finalizedWorld(worldWithKeyMoments())
    const club = world.clubs[world.clubId]!
    const report = world.lastMatch!
    report.keyMoments = []
    report.mediaReaction = undefined
    delete world.clubs[report.homeId]

    render(<MatchReview world={world} club={club} match={report} />)

    expect(screen.getByText('文字直播')).toBeInTheDocument()
    expect(screen.queryByText('媒体反应')).not.toBeInTheDocument()
    expect(screen.queryByText('关键回合回顾')).not.toBeInTheDocument()
  })
})
