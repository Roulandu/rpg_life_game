import { Sparkles } from 'lucide-react'
import type { Player } from '../../../domain'
import { ATTR_KEYS, ATTR_LABELS, POSITION_LABELS, overall } from '../../../domain'
import { Card, SectionTitle } from '../../components/Card'
import { StatBar } from '../../components/StatBar'

export function ProfileOverview({ user, clubName }: { user: Player; clubName: string }) {
  const visibleAttributes = user.position === 'GK' ? ATTR_KEYS : ATTR_KEYS.filter((key) => key !== 'goalkeeping')

  return (
    <div className="min-w-0">
      <Card className="mb-3 overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="grid size-20 shrink-0 place-items-center rounded-2xl border border-accent/30 bg-accent/10">
            <div className="text-center">
              <p className="font-mono text-3xl font-semibold leading-none text-accent">{overall(user).toFixed(1)}</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-dim">综合</p>
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-text">{user.name}</h1>
            <p className="mt-0.5 text-[11px] text-muted">
              {clubName} · {POSITION_LABELS[user.position]}
            </p>
            <p className="mt-0.5 text-[11px] text-dim">
              {user.nationality} · {user.age} 岁 · {user.foot === 'L' ? '左脚' : user.foot === 'R' ? '右脚' : '双足'}
            </p>
          </div>
        </div>
        {user.traits.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {user.traits.map((trait) => (
              <span key={trait} className="chip text-teal">
                <Sparkles size={11} /> {trait}
              </span>
            ))}
          </div>
        ) : null}
        {user.injury ? (
          <p className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] text-danger">
            {user.injury.kind} · 预计缺阵 {user.injury.weeksLeft} 周
          </p>
        ) : null}
      </Card>

      <section className="mb-3">
        <SectionTitle>技术属性</SectionTitle>
        <Card>
          <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 lg:grid-cols-3">
            {visibleAttributes.map((key) => (
              <StatBar key={key} label={ATTR_LABELS[key]} value={user.attributes[key]} />
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}
