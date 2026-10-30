import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useGameStore } from '../../store'
import { computeLeagueTable } from '../../domain'
import { selectClubFixtures } from '../../store'
import { formatSeasonLabel } from '../../lib'
import { PageHeader } from '../components/PageHeader'
import { FixtureListCard } from './schedule/FixtureListCard'
import { LeagueTableCard } from './schedule/LeagueTableCard'
import clsx from 'clsx'

export function ScheduleScreen() {
  const navigate = useNavigate()
  const world = useGameStore((state) => state.world)
  const [tab, setTab] = useState<'fixtures' | 'table'>('fixtures')
  if (!world) return null

  const club = world.clubs[world.clubId]
  const league = world.leagues[club.leagueId]
  const fixtures = selectClubFixtures(world)
  const table = computeLeagueTable(world, league.id)
  const userPosition = table.findIndex((row) => row.clubId === club.id) + 1

  return (
    <div className="page-pad pb-6 sm:mx-auto sm:max-w-[960px] lg:max-w-none">
      <PageHeader
        eyebrow={formatSeasonLabel(world.season)}
        title="赛程与联赛"
        subtitle={`${league.nameZh} · ${club.nameZh}`}
        right={
          <button type="button" className="btn-ghost px-2" aria-label="返回主页" onClick={() => navigate('/game')}>
            <ArrowLeft size={17} />
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-line bg-card-2 p-1 lg:hidden">
        <button
          type="button"
          className={clsx(
            'min-h-9 rounded-lg text-xs font-medium transition',
            tab === 'fixtures' ? 'bg-accent text-accent-ink' : 'text-muted hover:text-text',
          )}
          onClick={() => setTab('fixtures')}
        >
          赛程
        </button>
        <button
          type="button"
          className={clsx(
            'min-h-9 rounded-lg text-xs font-medium transition',
            tab === 'table' ? 'bg-accent text-accent-ink' : 'text-muted hover:text-text',
          )}
          onClick={() => setTab('table')}
        >
          积分榜
        </button>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <div
          data-testid="schedule-fixtures"
          className={clsx(tab === 'fixtures' ? '' : 'hidden', 'lg:block')}
        >
          <FixtureListCard world={world} club={club} fixtures={fixtures} />
        </div>
        <div data-testid="schedule-table" className={clsx(tab === 'table' ? '' : 'hidden', 'lg:block')}>
          <LeagueTableCard
            world={world}
            league={league}
            table={table}
            clubId={club.id}
            userPosition={userPosition}
          />
        </div>
      </div>
    </div>
  )
}
