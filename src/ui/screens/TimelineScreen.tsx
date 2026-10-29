import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Award, CalendarRange, TrendingUp } from 'lucide-react'
import { useGameStore } from '../../store'
import { formatRating, formatSeasonLabel } from '../../lib'
import { Card, EmptyState, SectionTitle } from '../components/Card'

export function TimelineScreen() {
  const navigate = useNavigate()
  const world = useGameStore((state) => state.world)
  if (!world) return null

  const user = world.players[world.playerId]
  const summaries = [...world.seasonSummaries].reverse()
  const totalApps = user.history.reduce((sum, entry) => sum + entry.appearances, 0) + user.seasonStats.appearances
  const totalGoals = user.history.reduce((sum, entry) => sum + entry.goals, 0) + user.seasonStats.goals
  const totalAssists = user.history.reduce((sum, entry) => sum + entry.assists, 0) + user.seasonStats.assists
  const allAwards = summaries.flatMap((summary) => summary.awards)
  if (world.retired) allAwards.push('退役')

  return (
    <div className="page-pad pb-6">
      <button type="button" className="btn-ghost -ml-2 mb-3 px-2" onClick={() => navigate('/more')}>
        <ArrowLeft size={16} /> 更多
      </button>
      <div className="mb-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-accent">Career Timeline</p>
        <h1 className="text-xl font-semibold text-text">生涯时间线</h1>
        <p className="mt-1 text-xs text-muted">
          {user.name} · {user.nationality} · {user.age} 岁
        </p>
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="font-mono text-xl text-text">{totalApps}</p>
            <p className="text-[10px] text-dim">生涯出场</p>
          </div>
          <div>
            <p className="font-mono text-xl text-accent">{totalGoals}</p>
            <p className="text-[10px] text-dim">生涯进球</p>
          </div>
          <div>
            <p className="font-mono text-xl text-teal">{totalAssists}</p>
            <p className="text-[10px] text-dim">生涯助攻</p>
          </div>
        </div>
        {allAwards.length > 0 ? (
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {[...new Set(allAwards)].map((award) => (
              <span key={award} className="chip border-gold/30 text-gold">
                <Award size={11} /> {award}
              </span>
            ))}
          </div>
        ) : null}
      </Card>

      {world.retired ? (
        <Card className="mb-4 border-gold/30">
          <p className="flex items-center gap-2 text-sm font-medium text-gold">
            <TrendingUp size={15} /> 球员生涯已结束
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            你留下的数据与荣誉会一直保存在这条时间线上。
          </p>
        </Card>
      ) : null}

      <section>
        <SectionTitle right={<CalendarRange size={14} className="text-dim" />}>赛季记录</SectionTitle>
        {summaries.length === 0 ? (
          <EmptyState
            title="第一个赛季还在进行中"
            body={`当前 ${formatSeasonLabel(world.season)} 第 ${world.week} 周。赛季结束后，这里会生成一条完整的赛季记录。`}
          />
        ) : (
          <div className="space-y-2">
            {summaries.map((summary) => (
              <Card key={summary.season} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] text-dim">{formatSeasonLabel(summary.season)}</p>
                    <p className="mt-0.5 text-sm font-medium text-text">{summary.clubName}</p>
                    <p className="mt-0.5 text-[10px] text-muted">
                      联赛第 {summary.leaguePosition || '—'} 名 · T{summary.tier}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-lg text-text">{summary.averageRating.toFixed(1)}</p>
                    <p className="text-[9px] text-dim">平均评分</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-line-soft bg-card-2/70 py-2 text-center">
                  <div>
                    <p className="font-mono text-sm text-text">{summary.appearances}</p>
                    <p className="text-[9px] text-dim">出场</p>
                  </div>
                  <div>
                    <p className="font-mono text-sm text-text">{summary.goals}</p>
                    <p className="text-[9px] text-dim">进球</p>
                  </div>
                  <div>
                    <p className="font-mono text-sm text-text">{summary.assists}</p>
                    <p className="text-[9px] text-dim">助攻</p>
                  </div>
                </div>
                {summary.awards.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {summary.awards.map((award) => (
                      <span key={award} className="chip border-gold/30 text-gold">
                        <Award size={10} /> {award}
                      </span>
                    ))}
                  </div>
                ) : null}
                {summary.note ? <p className="mt-2 text-[10px] text-teal">{summary.note}</p> : null}
              </Card>
            ))}
          </div>
        )}
      </section>

      {user.history.length > 0 ? (
        <p className="mt-4 px-1 text-[10px] leading-relaxed text-dim">
          上赛季平均评分：{formatRating(user.history[user.history.length - 1]?.averageRating ?? null)}。转会与更多奖项会在后续版本加入时间线。
        </p>
      ) : null}
    </div>
  )
}
