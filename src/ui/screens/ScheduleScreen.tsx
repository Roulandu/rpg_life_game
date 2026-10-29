import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useGameStore } from '../../store/gameStore'
import { computeLeagueTable } from '../../domain/leagueTable'
import { selectClubFixtures } from '../../store/selectors'
import { formatSeasonLabel } from '../../lib/format'
import { Card, SectionTitle } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { fixtureResultForClub, formClass, formLabel } from '../gameHelpers'
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
    <div className="page-pad pb-6">
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

      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-line bg-card-2 p-1">
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

      {tab === 'fixtures' ? (
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
            <p className="text-xs font-medium text-text">全部赛程</p>
            <span className="chip">
              {fixtures.filter((fixture) => fixture.status === 'played').length} / {fixtures.length} 已赛
            </span>
          </div>
          <div className="divide-y divide-line-soft">
            {fixtures.map((fixture) => {
              const isHome = fixture.homeId === club.id
              const opponent = world.clubs[isHome ? fixture.awayId : fixture.homeId]
              const result = fixtureResultForClub(fixture, club.id)
              const current = fixture.week === world.week && fixture.status === 'scheduled'
              return (
                <div
                  key={fixture.id}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2.5 text-[11px]',
                    current && 'bg-accent/5',
                  )}
                >
                  <span className="w-7 shrink-0 font-mono text-[10px] text-dim">{fixture.week}</span>
                  <span className={clsx('w-8 shrink-0 text-[10px]', isHome ? 'text-teal' : 'text-dim')}>
                    {isHome ? '主' : '客'}
                  </span>
                  <span className="flex-1 truncate text-text">{opponent?.nameZh ?? '未知球队'}</span>
                  {fixture.status === 'played' ? (
                    <span className="w-12 text-center font-mono text-xs text-text">
                      {isHome ? fixture.homeGoals : fixture.awayGoals}-{isHome ? fixture.awayGoals : fixture.homeGoals}
                    </span>
                  ) : (
                    <span className={clsx('w-12 text-center text-[10px]', current ? 'text-accent' : 'text-dim')}>
                      {current ? '本周' : '未赛'}
                    </span>
                  )}
                  {result ? (
                    <span className={clsx('grid size-5 shrink-0 place-items-center rounded border text-[9px] font-bold', formClass(result))}>
                      {formLabel(result)}
                    </span>
                  ) : (
                    <span className="size-5 shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between px-1">
            <SectionTitle>当前排名</SectionTitle>
            <span className="text-[11px] text-accent">第 {userPosition || '—'} 名</span>
          </div>
          <Card className="overflow-hidden p-0">
            <div className="grid grid-cols-[28px_1fr_26px_26px_26px_30px] gap-1 border-b border-line-soft px-3 py-2 text-[10px] text-dim">
              <span className="text-right">#</span>
              <span>球队</span>
              <span className="text-right">赛</span>
              <span className="text-right">平</span>
              <span className="text-right">净</span>
              <span className="text-right">分</span>
            </div>
            <div className="divide-y divide-line-soft">
              {table.map((row, index) => {
                const tableClub = world.clubs[row.clubId]
                const isUser = row.clubId === club.id
                const isPromotion = league.tier === 2 && index < league.promotionSlots
                const isRelegation =
                  league.tier === 1 && index >= league.clubIds.length - league.relegationSlots
                return (
                  <div
                    key={row.clubId}
                    className={clsx(
                      'grid grid-cols-[28px_1fr_26px_26px_26px_30px] items-center gap-1 px-3 py-2 text-[11px]',
                      isUser ? 'bg-accent/10 text-accent' : 'text-muted',
                    )}
                  >
                    <span className="flex items-center justify-end gap-1">
                      {isPromotion ? <span className="size-1.5 rounded-full bg-accent" aria-label="升级区" /> : null}
                      {isRelegation ? <span className="size-1.5 rounded-full bg-danger" aria-label="降级区" /> : null}
                      <span className={clsx('font-mono text-[10px]', isUser ? 'text-accent' : 'text-dim')}>
                        {index + 1}
                      </span>
                    </span>
                    <span className={clsx('truncate', isUser ? 'font-medium text-accent' : 'text-text')}>
                      {tableClub?.nameZh ?? row.clubId}
                    </span>
                    <span className="text-right font-mono text-[10px] text-dim">{row.played}</span>
                    <span className="text-right font-mono text-[10px] text-dim">{row.drawn}</span>
                    <span className="text-right font-mono text-[10px] text-dim">
                      {row.goalsFor - row.goalsAgainst > 0 ? '+' : ''}
                      {row.goalsFor - row.goalsAgainst}
                    </span>
                    <span className={clsx('text-right font-mono', isUser ? 'text-accent' : 'text-text')}>{row.points}</span>
                  </div>
                )
              })}
            </div>
          </Card>
          <p className="mt-2 px-1 text-[10px] text-dim">
            {league.tier === 1
              ? `末 ${league.relegationSlots} 名降级。`
              : `前 ${league.promotionSlots} 名升级。`}
            胜 3 分，平 1 分。
          </p>
        </>
      )}
    </div>
  )
}
