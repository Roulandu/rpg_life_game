import { Award, Shield } from 'lucide-react'
import type { Player } from '../../../domain'
import { formatRating, formatSeasonLabel } from '../../../lib'
import { Card, EmptyState, SectionTitle } from '../../components/Card'

export function CareerHistory({ user }: { user: Player }) {
  return (
    <section className="lg:mt-6">
      <SectionTitle right={<Shield size={14} className="text-dim" />}>生涯记录</SectionTitle>
      {user.history.length === 0 ? (
        <EmptyState title="还没有完整赛季记录" body="赛季结束后，这里会保存你的每一段经历。" />
      ) : (
        <div className="space-y-1.5">
          {[...user.history].reverse().map((entry) => (
            <Card key={`${entry.season}-${entry.clubId}`} className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-text">
                    {formatSeasonLabel(entry.season)} · {entry.clubName}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {entry.appearances} 场 · {entry.goals} 球 · {entry.assists} 助攻 · {formatRating(entry.averageRating)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {entry.note?.includes('冠军') ? <Award size={14} className="text-gold" /> : null}
                  <span className="chip">T{entry.tier}</span>
                </div>
              </div>
              {entry.note ? <p className="mt-1.5 text-[10px] text-teal">{entry.note}</p> : null}
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
