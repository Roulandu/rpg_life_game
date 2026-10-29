import { UserX } from 'lucide-react'
import { POSITION_LABELS } from '../../../domain'
import type { KeyMoment, MatchReport } from '../../../domain'
import { formatRating } from '../../../lib'
import { Card, SectionTitle } from '../../components/Card'
import { ratingTone } from '../../labels'
import clsx from 'clsx'
import { MomentumChips } from './MomentumChips'
import { successCountOf, type Momentum } from './matchdayUtils'

export function UserPerformanceCard({
  match,
  moments,
  momentum,
}: {
  match: MatchReport
  moments: KeyMoment[]
  momentum: Momentum
}) {
  return (
    <Card className={clsx('mb-4', match.userPlayed ? 'border-accent/25' : '')}>
      <SectionTitle>你的表现</SectionTitle>
      {match.userPlayed ? (
        <UserStatBlock match={match} moments={moments} momentum={momentum} />
      ) : (
        <NoAppearance />
      )}
    </Card>
  )
}

function UserStatBlock({ match, moments, momentum }: { match: MatchReport; moments: KeyMoment[]; momentum: Momentum }) {
  return (
    <>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className={clsx('font-mono text-4xl font-semibold leading-none', ratingTone(match.userRating))}>
            {formatRating(match.userRating)}
          </p>
          <p className="mt-1 text-[10px] text-dim">赛后评分</p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-right">
          <Stat label="分钟" value={`${match.userMinutes}'`} />
          <Stat label="进球" value={String(match.userGoals)} />
          <Stat label="助攻" value={String(match.userAssists)} />
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted">
        {match.userStarted ? '首发登场' : '替补登场'} · {match.userPosition ? POSITION_LABELS[match.userPosition] : '—'}
        {ratingComment(match.userRating)}
      </p>
      {moments.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="chip font-mono">
            关键回合 {successCountOf(moments)}/{moments.length}
          </span>
          <MomentumChips momentum={momentum} />
        </div>
      ) : null}
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-lg text-text">{value}</p>
      <p className="text-[10px] text-dim">{label}</p>
    </div>
  )
}

function ratingComment(rating: number | null): string {
  if (rating == null) return ' · 稳定完成教练布置的任务。'
  if (rating >= 7.5) return ' · 一场值得记住的比赛。'
  if (rating < 6.2) return ' · 这不是你想要的夜晚。'
  return ' · 稳定完成教练布置的任务。'
}

function NoAppearance() {
  return (
    <div className="flex items-start gap-3">
      <UserX size={20} className="mt-0.5 shrink-0 text-dim" />
      <div>
        <p className="text-sm text-text">本场没有获得出场机会</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          教练选择了其他球员。训练状态、教练信任和比赛锐度都会影响下一次的选择。
        </p>
      </div>
    </div>
  )
}
