import { useNavigate } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import type { Fixture, GameEvent, WorldState } from '../../../domain'
import { TRAINING_LABELS, fixtureDayOf, weekDayRoles } from '../../../domain'
import { formatDayLabel } from '../../../lib'
import { Card, SectionTitle } from '../../components/Card'
import { EXTRA_ACTION_LABELS } from '../../labels'
import { opponentOfClub } from '../../gameHelpers'

interface PlanRow {
  kind: string
  detail: string
}

function fixtureOnDay(world: WorldState): Fixture | undefined {
  return Object.values(world.fixtures).find(
    (fixture) =>
      fixture.season === world.season &&
      fixture.week === world.week &&
      fixtureDayOf(fixture) === world.day &&
      (fixture.homeId === world.clubId || fixture.awayId === world.clubId),
  )
}

function planRows(world: WorldState): PlanRow[] {
  const fixtures = Object.values(world.fixtures)
  const roles = weekDayRoles(fixtures, world.season, world.week, world.clubId)
  const match = fixtureOnDay(world)
  if (match) {
    const opponent = opponentOfClub(world, match, world.clubId)
    return [{ kind: '比赛日', detail: `${match.homeId === world.clubId ? '主场' : '客场'} vs ${opponent?.nameZh ?? '未知球队'}` }]
  }
  const rows: PlanRow[] = roles.trainingDays.includes(world.day)
    ? [{ kind: '训练日', detail: TRAINING_LABELS[world.weekPlan.training] }]
    : [{ kind: '休整日', detail: '今天不安排训练与比赛' }]
  const extra = world.weekPlan.extra
  if (roles.extraDay === world.day && extra !== 'none') {
    rows.push({ kind: '额外安排', detail: EXTRA_ACTION_LABELS[extra].label })
  }
  return rows
}

export function TodaySection({ world, events }: { world: WorldState; events: GameEvent[] }) {
  const navigate = useNavigate()
  const rows = planRows(world)

  return (
    <section className="mb-4" data-dashboard-block="today">
      <SectionTitle
        right={
          events.length > 0 ? (
            <span className="chip border-accent/30 text-accent">{events.length} 个待处理</span>
          ) : fixtureOnDay(world) ? null : (
            <span className="chip">无待处理</span>
          )
        }
      >
        今天
      </SectionTitle>
      <Card className="p-4">
        <p className="font-mono text-[11px] text-muted">{formatDayLabel(world.season, world.week, world.day)}</p>
        <div className="mt-2 space-y-1.5">
          {rows.map((row) => (
            <p key={row.kind} className="flex items-baseline gap-2 text-xs">
              <span className="shrink-0 font-semibold text-text">{row.kind}</span>
              <span className="min-w-0 flex-1 truncate text-muted">{row.detail}</span>
            </p>
          ))}
        </div>
        {events.length > 0 ? (
          <div className="mt-3 space-y-2 border-t border-line-soft pt-3">
            {events.slice(0, 2).map((event) => (
              <div key={event.id} className="flex items-start gap-2">
                <MessageSquare size={14} className="mt-0.5 shrink-0 text-accent" />
                <p className="min-w-0 text-xs leading-relaxed text-text">
                  {event.sender ? <span className="text-dim">{event.sender} · </span> : null}
                  {event.title}
                </p>
              </div>
            ))}
            <button type="button" className="btn-secondary mt-1 w-full" onClick={() => navigate('/inbox')}>
              去处理事件
            </button>
          </div>
        ) : (
          <p className="mt-3 border-t border-line-soft pt-3 text-[11px] text-dim">今天没有需要你处理的事。</p>
        )}
      </Card>
    </section>
  )
}
