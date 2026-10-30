import type { Player, WorldState } from '../../../domain'
import { round1 } from '../../../domain'
import { formatRating, formatSeasonLabel } from '../../../lib'
import { Card, SectionTitle } from '../../components/Card'
import { StatBar } from '../../components/StatBar'

export function ProfileSeason({ world, user }: { world: WorldState; user: Player }) {
  const stats = user.seasonStats
  const averageRating = stats.ratingCount > 0 ? round1(stats.ratingSum / stats.ratingCount) : null

  return (
    <div className="min-w-0">
      <section className="mb-3">
        <SectionTitle right={<span className="text-[10px] text-dim">{formatSeasonLabel(world.season)}</span>}>
          本赛季数据
        </SectionTitle>
        <Card>
          <div className="grid grid-cols-3 gap-y-3 text-center">
            <Metric label="出场" value={stats.appearances} />
            <Metric label="首发" value={stats.starts} />
            <Metric label="分钟" value={stats.minutes} />
            <Metric label="进球" value={stats.goals} />
            <Metric label="助攻" value={stats.assists} />
            <Metric label="平均评分" value={formatRating(averageRating)} accent />
          </div>
        </Card>
      </section>

      <section className="mb-3">
        <SectionTitle>声望</SectionTitle>
        <Card>
          <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
            <StatBar label="本地球迷" value={user.reputation.local} />
            <StatBar label="国内知名度" value={user.reputation.national} />
            <StatBar label="媒体声望" value={user.reputation.media} />
            <StatBar label="球迷基础" value={user.reputation.fanbase} />
          </div>
        </Card>
      </section>
    </div>
  )
}

function Metric({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div>
      <p className={`font-mono text-lg font-semibold tabular-nums ${accent ? 'text-accent' : 'text-text'}`}>{value}</p>
      <p className="mt-0.5 text-[10px] text-dim">{label}</p>
    </div>
  )
}
