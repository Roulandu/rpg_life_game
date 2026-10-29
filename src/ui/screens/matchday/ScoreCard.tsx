import { Award, CalendarDays } from 'lucide-react'
import type { MatchReport } from '../../../domain'
import { formatRating } from '../../../lib'
import { Card } from '../../components/Card'
import clsx from 'clsx'

export function ScoreCard({
  match,
  clubId,
  stadium,
  liveMinute,
}: {
  match: MatchReport
  clubId: string
  stadium: string
  liveMinute: number | null
}) {
  const live = liveMinute != null

  return (
    <Card className="mb-3 overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-line-soft px-4 py-2.5 text-[10px] text-dim">
        <span className="flex items-center gap-1.5">
          <CalendarDays size={12} /> {stadium}
        </span>
        {live ? (
          <span>进行中 · 第 {liveMinute} 分钟</span>
        ) : (
          <span>{match.attendance.toLocaleString('zh-CN')} 名观众</span>
        )}
      </div>
      <div className={clsx('grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4', live ? 'py-5' : 'py-6')}>
        <p className={clsx('min-w-0 text-center text-sm font-medium', match.homeId === clubId ? 'text-accent' : 'text-text')}>
          {match.homeName}
        </p>
        <p className={clsx('font-mono font-semibold tabular-nums text-text', live ? 'text-2xl' : 'text-3xl')}>
          {match.homeGoals} - {match.awayGoals}
        </p>
        <p className={clsx('min-w-0 text-center text-sm font-medium', match.awayId === clubId ? 'text-accent' : 'text-text')}>
          {match.awayName}
        </p>
      </div>
      {live ? null : (
        <div className="flex items-center justify-between border-t border-line-soft px-4 py-2.5 text-[10px] text-muted">
          <span>全场结束</span>
          <span className="flex items-center gap-1">
            <Award size={12} className="text-gold" /> 最佳：{match.motmName}（{formatRating(match.motmRating)}）
          </span>
        </div>
      )}
    </Card>
  )
}
