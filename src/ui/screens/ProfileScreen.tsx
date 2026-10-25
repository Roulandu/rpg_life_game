import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Award, Shield, Sparkles } from 'lucide-react'
import {
  ATTR_KEYS,
  ATTR_LABELS,
  POSITION_LABELS,
  overall,
  round1,
} from '../../domain/attributes'
import { useGameStore } from '../../store/gameStore'
import { formatMoney, formatMoneyShort, formatRating, formatSeasonLabel } from '../../lib/format'
import { Card, EmptyState, SectionTitle } from '../components/Card'
import { StatBar } from '../components/StatBar'

export function ProfileScreen() {
  const navigate = useNavigate()
  const world = useGameStore((state) => state.world)
  if (!world) return null

  const user = world.players[world.playerId]
  const club = world.clubs[world.clubId]
  const stats = user.seasonStats
  const averageRating = stats.ratingCount > 0 ? round1(stats.ratingSum / stats.ratingCount) : null
  const headroom = user.potential - overall(user)
  const scouting =
    headroom >= 15
      ? '球探认为你还有巨大的成长空间。'
      : headroom >= 8
        ? '你仍有明显的提升空间，尤其是稳定性和比赛阅读。'
        : headroom >= 3
          ? '你正在接近成熟期，细节决定上限。'
          : '你已非常接近自己的潜力上限。'

  const visibleAttributes = user.position === 'GK' ? ATTR_KEYS : ATTR_KEYS.filter((key) => key !== 'goalkeeping')

  return (
    <div className="page-pad pb-6">
      <button type="button" className="btn-ghost -ml-2 mb-3 px-2" onClick={() => navigate('/game')}>
        <ArrowLeft size={16} /> 回到主页
      </button>

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
              {club.nameZh} · {POSITION_LABELS[user.position]}
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
          <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
            {visibleAttributes.map((key) => (
              <StatBar key={key} label={ATTR_LABELS[key]} value={user.attributes[key]} />
            ))}
          </div>
        </Card>
      </section>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <Card className="p-3">
          <p className="text-[10px] text-dim">周薪</p>
          <p className="mt-1 font-mono text-lg text-text">{formatMoneyShort(user.contract.wageWeekly)}</p>
          <p className="mt-1 text-[10px] text-muted">合同至 {formatSeasonLabel(user.contract.endSeason)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] text-dim">身价</p>
          <p className="mt-1 font-mono text-lg text-accent">{formatMoneyShort(user.value)}</p>
          <p className="mt-1 text-[10px] text-muted">余额 {formatMoney(world.finance.balance)}</p>
        </Card>
      </div>

      <section className="mb-3">
        <SectionTitle right={<span className="chip">潜力评估</span>}>球探报告</SectionTitle>
        <Card className="p-4">
          <p className="text-[12px] leading-relaxed text-muted">{scouting}</p>
          <div className="mt-3">
            <StatBar label="当前能力" value={overall(user)} max={Math.max(user.potential, overall(user))} tone="accent" />
            <p className="mt-1.5 text-[10px] text-dim">潜力上限不会被直接显示。表现越好，球探的判断越接近真实。</p>
          </div>
        </Card>
      </section>

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

      <section>
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
