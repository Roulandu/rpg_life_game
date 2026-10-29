import { CalendarDays } from 'lucide-react'
import type { Club, Fixture, WorldState } from '../../../domain'
import { Card } from '../../components/Card'
import { TeamBlock } from './TeamBlock'
import clsx from 'clsx'

export function NextMatchPanel({
  world,
  club,
  next,
  opponent,
  isHome,
  opponentFormLabel,
}: {
  world: WorldState
  club: Club
  next: Fixture | undefined
  opponent: Club | null
  isHome: boolean
  opponentFormLabel: string
}) {
  return (
    <Card className="mb-3 overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-line-soft px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-[11px] text-muted">
          <CalendarDays size={13} /> 下一场 · 第 {next?.week ?? '—'} 周
        </span>
        <span className={clsx('chip', isHome ? 'border-accent/30 text-accent' : '')}>{isHome ? '主场' : '客场'}</span>
      </div>
      {next && opponent ? (
        <NextMatchBody world={world} club={club} next={next} opponent={opponent} isHome={isHome} label={opponentFormLabel} />
      ) : (
        <div className="px-4 py-6 text-center text-xs text-muted">本赛季赛程已经全部结束。</div>
      )}
    </Card>
  )
}

function NextMatchBody({
  world,
  club,
  next,
  opponent,
  isHome,
  label,
}: {
  world: WorldState
  club: Club
  next: Fixture
  opponent: Club
  isHome: boolean
  label: string
}) {
  return (
    <>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-4">
        <TeamBlock name={isHome ? club.nameZh : opponent.nameZh} colors={isHome ? club.colors : opponent.colors} align="left" />
        <div className="text-center">
          <p className="font-mono text-[10px] text-dim">VS</p>
          <p className="mt-1 text-[9px] text-dim">第 {next.week} 周</p>
        </div>
        <TeamBlock name={isHome ? opponent.nameZh : club.nameZh} colors={isHome ? opponent.colors : club.colors} align="right" />
      </div>
      <div className="flex items-center justify-between border-t border-line-soft px-4 py-2 text-[10px] text-dim">
        <span>{world.clubs[next.homeId]?.stadium ?? club.stadium}</span>
        <span>对手近况 {label}</span>
      </div>
    </>
  )
}
