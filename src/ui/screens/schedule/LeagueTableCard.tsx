import type { League, LeagueTableRow, WorldState } from '../../../domain'
import { Card, SectionTitle } from '../../components/Card'
import clsx from 'clsx'

export function LeagueTableCard({
  world,
  league,
  table,
  clubId,
  userPosition,
}: {
  world: WorldState
  league: League
  table: LeagueTableRow[]
  clubId: string
  userPosition: number
}) {
  return (
    <>
      <div className="mb-2 flex items-center justify-between px-1">
        <SectionTitle>当前排名</SectionTitle>
        <span className="text-[11px] text-accent">第 {userPosition || '—'} 名</span>
      </div>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <div className="grid grid-cols-[28px_1fr_26px_26px_26px_30px] gap-1 border-b border-line-soft px-3 py-2 text-[10px] text-dim">
            <span className="text-right">#</span>
            <span>球队</span>
            <span className="text-right">赛</span>
            <span className="text-right">平</span>
            <span className="text-right">净</span>
            <span className="text-right">分</span>
          </div>
          <div className="divide-y divide-line-soft">
            {table.map((row, index) => (
              <TableRow key={row.clubId} world={world} league={league} clubId={clubId} row={row} index={index} />
            ))}
          </div>
        </div>
      </Card>
      <p className="mt-2 px-1 text-[10px] text-dim">
        {league.tier === 1 ? `末 ${league.relegationSlots} 名降级。` : `前 ${league.promotionSlots} 名升级。`}
        胜 3 分，平 1 分。
      </p>
    </>
  )
}

function TableRow({
  world,
  league,
  clubId,
  row,
  index,
}: {
  world: WorldState
  league: League
  clubId: string
  row: LeagueTableRow
  index: number
}) {
  const tableClub = world.clubs[row.clubId]
  const isUser = row.clubId === clubId
  const isPromotion = league.tier === 2 && index < league.promotionSlots
  const isRelegation = league.tier === 1 && index >= league.clubIds.length - league.relegationSlots

  return (
    <div
      className={clsx(
        'grid grid-cols-[28px_1fr_26px_26px_26px_30px] items-center gap-1 px-3 py-2 text-[11px]',
        isUser ? 'bg-accent/10 text-accent' : 'text-muted',
      )}
    >
      <span className="flex items-center justify-end gap-1">
        {isPromotion ? <span className="size-1.5 rounded-full bg-accent" aria-label="升级区" /> : null}
        {isRelegation ? <span className="size-1.5 rounded-full bg-danger" aria-label="降级区" /> : null}
        <span className={clsx('font-mono text-[10px]', isUser ? 'text-accent' : 'text-dim')}>{index + 1}</span>
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
}
