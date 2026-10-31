import type { Club, Fixture, WorldState } from '../../../domain'
import { Card } from '../../components/Card'
import { fixtureResultForClub, formClass, formLabel } from '../../gameHelpers'
import clsx from 'clsx'

export function FixtureListCard({
  world,
  club,
  fixtures,
}: {
  world: WorldState
  club: Club
  fixtures: Fixture[]
}) {
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
        <p className="text-xs font-medium text-text">全部赛程</p>
        <span className="chip">
          {fixtures.filter((fixture) => fixture.status === 'played').length} / {fixtures.length} 已赛
        </span>
      </div>
      <div className="divide-y divide-line-soft">
        {fixtures.map((fixture) => (
          <FixtureRow key={fixture.id} world={world} club={club} fixture={fixture} />
        ))}
      </div>
    </Card>
  )
}

function FixtureRow({ world, club, fixture }: { world: WorldState; club: Club; fixture: Fixture }) {
  const isHome = fixture.homeId === club.id
  const opponent = world.clubs[isHome ? fixture.awayId : fixture.homeId]
  const result = fixtureResultForClub(fixture, club.id)
  const current =
    fixture.week === world.week && (fixture.status === 'scheduled' || fixture.status === 'live')

  return (
    <div className={clsx('flex items-center gap-2 px-3 py-2.5 text-[11px]', current && 'bg-accent/5')}>
      <span className="w-7 shrink-0 font-mono text-[10px] text-dim">{fixture.week}</span>
      <span className={clsx('w-8 shrink-0 text-[10px]', isHome ? 'text-teal' : 'text-dim')}>
        {isHome ? '主' : '客'}
      </span>
      <span className="flex-1 truncate text-text">{opponent?.nameZh ?? '未知球队'}</span>
      <FixtureOutcome fixture={fixture} isHome={isHome} current={current} />
      {result ? (
        <span className={clsx('grid size-5 shrink-0 place-items-center rounded border text-[9px] font-bold', formClass(result))}>
          {formLabel(result)}
        </span>
      ) : (
        <span className="size-5 shrink-0" />
      )}
    </div>
  )
}

function LiveOutcome({ fixture, isHome }: { fixture: Fixture; isHome: boolean }) {
  const goalsFor = isHome ? fixture.homeGoals ?? 0 : fixture.awayGoals ?? 0
  const goalsAgainst = isHome ? fixture.awayGoals ?? 0 : fixture.homeGoals ?? 0
  return (
    <span className="flex w-14 shrink-0 flex-col items-center text-[9px] leading-tight text-accent">
      <span className="font-mono text-xs">
        {goalsFor}-{goalsAgainst}
      </span>
      <span>进行中</span>
    </span>
  )
}

function PlayedOutcome({ fixture, isHome }: { fixture: Fixture; isHome: boolean }) {
  return (
    <span className="w-12 text-center font-mono text-xs text-text">
      {isHome ? fixture.homeGoals : fixture.awayGoals}-{isHome ? fixture.awayGoals : fixture.homeGoals}
    </span>
  )
}

function FixtureOutcome({
  fixture,
  isHome,
  current,
}: {
  fixture: Fixture
  isHome: boolean
  current: boolean
}) {
  if (fixture.status === 'live') return <LiveOutcome fixture={fixture} isHome={isHome} />
  if (fixture.status === 'played') return <PlayedOutcome fixture={fixture} isHome={isHome} />

  return (
    <span className={clsx('w-12 text-center text-[10px]', current ? 'text-accent' : 'text-dim')}>
      {current ? '本周' : '未赛'}
    </span>
  )
}
