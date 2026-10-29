import { useNavigate } from 'react-router-dom'
import type { LeagueTableRow, WorldState } from '../../../domain'
import { Card, SectionTitle } from '../../components/Card'
import { formClass, formLabel } from '../../gameHelpers'
import clsx from 'clsx'

export function MiniLeagueTable({
  world,
  table,
  clubId,
  position,
}: {
  world: WorldState
  table: LeagueTableRow[]
  clubId: string
  position: number
}) {
  const navigate = useNavigate()
  const miniTable = table.slice(0, 5)
  if (position > 5) {
    const userRow = table[position - 1]
    if (userRow) miniTable.push(userRow)
  }
  const row = table[position - 1]

  return (
    <section className="mb-4">
      <SectionTitle
        right={
          <button type="button" className="text-[11px] text-muted hover:text-text" onClick={() => navigate('/schedule')}>
            完整赛程
          </button>
        }
      >
        联赛排名
      </SectionTitle>
      <Card className="p-3">
        <LeagueSummary row={row} position={position} />
        <div className="space-y-0.5">
          {miniTable.map((tableRow) => (
            <LeagueTableLine
              key={tableRow.clubId}
              tableRow={tableRow}
              index={table.findIndex((item) => item.clubId === tableRow.clubId) + 1}
              name={world.clubs[tableRow.clubId]?.nameZh ?? tableRow.clubId}
              isUserClub={tableRow.clubId === clubId}
            />
          ))}
        </div>
      </Card>
    </section>
  )
}

function LeagueSummary({ row, position }: { row: LeagueTableRow | undefined; position: number }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <div className="flex items-end gap-3">
        <div>
          <p className="text-[10px] text-dim">当前排名</p>
          <p className="font-mono text-3xl font-semibold leading-none text-text">{position || '—'}</p>
        </div>
        <div className="pb-0.5">
          <p className="text-[10px] text-dim">积分</p>
          <p className="font-mono text-lg leading-none text-accent">{row?.points ?? 0}</p>
        </div>
        <div className="pb-0.5">
          <p className="text-[10px] text-dim">战绩</p>
          <p className="font-mono text-[11px] text-muted">{row ? `${row.won}胜 ${row.drawn}平 ${row.lost}负` : '—'}</p>
        </div>
      </div>
      <div className="flex gap-1 pb-0.5">
        {(row?.form ?? []).length > 0 ? (
          row!.form.map((result, index) => (
            <span
              key={`${result}-${index}`}
              className={clsx('grid size-4 place-items-center rounded border text-[9px] font-bold', formClass(result))}
            >
              {formLabel(result)}
            </span>
          ))
        ) : (
          <span className="text-[10px] text-dim">暂无</span>
        )}
      </div>
    </div>
  )
}

function LeagueTableLine({
  tableRow,
  index,
  name,
  isUserClub,
}: {
  tableRow: LeagueTableRow
  index: number
  name: string
  isUserClub: boolean
}) {
  const diff = tableRow.goalsFor - tableRow.goalsAgainst
  return (
    <div
      className={clsx(
        'flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px]',
        isUserClub ? 'bg-accent/10 text-accent' : 'text-muted',
      )}
    >
      <span className="w-4 text-right font-mono text-dim">{index}</span>
      <span className="flex-1 truncate">{name}</span>
      <span className="w-6 text-right font-mono text-dim">{tableRow.played}</span>
      <span className="w-7 text-right font-mono text-dim">
        {diff > 0 ? '+' : ''}
        {diff}
      </span>
      <span className={clsx('w-6 text-right font-mono', isUserClub ? 'text-accent' : 'text-text')}>{tableRow.points}</span>
    </div>
  )
}
