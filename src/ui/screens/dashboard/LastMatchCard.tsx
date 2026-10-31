import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { MatchReport } from '../../../domain'
import clsx from 'clsx'

export function LastMatchCard({
  last,
  pendingMatch,
  resolvedMoments,
  totalMoments,
}: {
  last: MatchReport
  pendingMatch: boolean
  resolvedMoments: number
  totalMoments: number
}) {
  const navigate = useNavigate()
  const live = last.status === 'live'
  const progress = live
    ? ` · 第 ${last.currentMinute} 分钟`
    : pendingMatch
      ? ` · 关键回合 ${resolvedMoments}/${totalMoments}`
      : ''

  return (
    <button
      type="button"
      data-dashboard-block="last"
      className={clsx(
        'card mb-3 flex w-full items-center justify-between gap-3 px-4 py-3 text-left',
        pendingMatch && 'border-teal/40',
      )}
      onClick={() => navigate('/match')}
    >
      <div className="min-w-0">
        <p className={clsx('text-[10px] uppercase tracking-[0.14em]', pendingMatch ? 'text-teal' : 'text-dim')}>
          {pendingMatch ? '比赛日进行中' : '上轮结果'}
        </p>
        <p className="mt-0.5 truncate text-sm font-medium text-text">
          {last.homeName} {last.homeGoals}-{last.awayGoals} {last.awayName}
          {progress}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-muted">
          {pendingMatch ? '继续' : last.userPlayed ? `${last.userRating?.toFixed(1)} 分` : '未出场'}
        </span>
        <ChevronRight size={15} className="text-dim" />
      </div>
    </button>
  )
}
