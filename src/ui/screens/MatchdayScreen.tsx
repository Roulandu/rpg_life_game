import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Award,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FastForward,
  Sparkles,
  UserX,
  XCircle,
} from 'lucide-react'
import { POSITION_LABELS } from '../../domain/attributes'
import type { KeyMoment } from '../../domain/types'
import { useGameStore } from '../../store/gameStore'
import { formatRating, formatSeasonLabel } from '../../lib/format'
import { nextFixtureOf, opponentOfClub } from '../gameHelpers'
import { Card, SectionTitle } from '../components/Card'
import { ratingTone } from '../labels'
import clsx from 'clsx'

const EVENT_TONE: Record<string, string> = {
  goal: 'border-accent/40 bg-accent/10 text-accent',
  assist: 'border-teal/40 bg-teal/10 text-teal',
  chance: 'border-teal/30 bg-teal/5 text-teal',
  save: 'border-teal/30 bg-teal/5 text-teal',
  card: 'border-gold/40 bg-gold/10 text-gold',
  injury: 'border-danger/40 bg-danger/10 text-danger',
  sub: 'border-line bg-card-2 text-muted',
  info: 'border-line bg-card-2 text-muted',
  fulltime: 'border-line bg-card-2 text-text',
}

function momentDelta(moment: KeyMoment): { rating: number; morale: number; coach: number } {
  const outcome = moment.outcome
  if (!outcome) return { rating: 0, morale: 0, coach: 0 }
  return { rating: outcome.ratingDelta, morale: outcome.moraleDelta, coach: outcome.coachDelta }
}

export function MatchdayScreen() {
  const navigate = useNavigate()
  const world = useGameStore((state) => state.world)
  const resolveKeyMoment = useGameStore((state) => state.resolveKeyMoment)
  const skipKeyMoments = useGameStore((state) => state.skipKeyMoments)
  const [acting, setActing] = useState(false)
  if (!world) return null

  const match = world.lastMatch
  const club = world.clubs[world.clubId]
  const next = nextFixtureOf(world, club.id)
  const opponent = next ? opponentOfClub(world, next, club.id) : null
  const moments = match?.keyMoments ?? []
  const pending = moments.filter((moment) => !moment.outcome)
  const active = pending[0] ?? null
  const resolvedCount = moments.length - pending.length

  async function choose(momentId: string, optionId: string) {
    if (acting) return
    setActing(true)
    await resolveKeyMoment(momentId, optionId)
    setActing(false)
  }

  async function skip() {
    if (acting) return
    setActing(true)
    await skipKeyMoments()
    setActing(false)
  }

  const backButton = (
    <button type="button" className="btn-ghost -ml-2 mb-3 px-2" onClick={() => navigate('/game')}>
      <ArrowLeft size={16} /> 回到主页
    </button>
  )

  if (match && active) {
    const momentum = moments.reduce(
      (total, moment) => {
        const delta = momentDelta(moment)
        return {
          rating: total.rating + delta.rating,
          morale: total.morale + delta.morale,
          coach: total.coach + delta.coach,
        }
      },
      { rating: 0, morale: 0, coach: 0 },
    )

    return (
      <div className="page-pad pb-6">
        {backButton}

        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-accent">Matchday</p>
            <h1 className="text-xl font-semibold text-text">比赛日 · 关键回合</h1>
          </div>
          <span className="chip">
            {formatSeasonLabel(match.season)} · 第 {match.week} 周
          </span>
        </div>

        <Card className="mb-3 overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-line-soft px-4 py-2.5 text-[10px] text-dim">
            <span className="flex items-center gap-1.5">
              <CalendarDays size={12} /> {world.clubs[match.homeId]?.stadium ?? club.stadium}
            </span>
            <span>进行中 · 第 {active.minute} 分钟</span>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-5">
            <p className={clsx('min-w-0 text-center text-sm font-medium', match.homeId === club.id ? 'text-accent' : 'text-text')}>
              {match.homeName}
            </p>
            <p className="font-mono text-2xl font-semibold tabular-nums text-text">
              {match.homeGoals} - {match.awayGoals}
            </p>
            <p className={clsx('min-w-0 text-center text-sm font-medium', match.awayId === club.id ? 'text-accent' : 'text-text')}>
              {match.awayName}
            </p>
          </div>
        </Card>

        <section className="mb-3">
          <SectionTitle
            right={
              <span className="chip border-teal/30 text-teal">
                关键回合 {resolvedCount + 1}/{moments.length}
              </span>
            }
          >
            轮到你做决定
          </SectionTitle>
          <Card className="border-teal/30">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-text">{active.titleZh}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">{active.promptZh}</p>
              </div>
              <span className="chip shrink-0 font-mono">{active.minute}&apos;</span>
            </div>
            <div className="mt-3 space-y-1.5">
              {active.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={acting}
                  className="w-full rounded-xl border border-line bg-card-2 px-3 py-2.5 text-left transition hover:border-teal/60 disabled:opacity-60"
                  onClick={() => void choose(active.id, option.id)}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-text">{option.labelZh}</span>
                    <span className="chip shrink-0 font-mono text-[10px]">
                      成功率 {Math.round(option.successChance * 100)}%
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-relaxed text-muted">
                    {option.descriptionZh}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn-ghost mt-2 w-full justify-center text-[11px]"
              disabled={acting}
              onClick={() => void skip()}
            >
              <FastForward size={13} /> 跳过剩余回合（按稳妥选择处理）
            </button>
          </Card>
        </section>

        {resolvedCount > 0 ? (
          <section className="mb-3">
            <SectionTitle>已经发生</SectionTitle>
            <div className="space-y-1.5">
              {moments
                .filter((moment) => moment.outcome)
                .map((moment) => (
                  <div
                    key={moment.id}
                    className={clsx(
                      'flex items-start gap-2.5 rounded-xl border px-3 py-2',
                      moment.outcome?.success
                        ? 'border-teal/30 bg-teal/5'
                        : 'border-danger/25 bg-danger/5',
                    )}
                  >
                    {moment.outcome?.success ? (
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-teal" />
                    ) : (
                      <XCircle size={14} className="mt-0.5 shrink-0 text-danger" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] text-dim">
                        {moment.minute}&apos; · {moment.titleZh}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-text">{moment.outcome?.textZh}</p>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        ) : null}

        {resolvedCount > 0 ? (
          <Card className="p-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-dim">到目前为止的影响</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span className="chip font-mono">评分 {momentum.rating >= 0 ? '+' : ''}{momentum.rating.toFixed(1)}</span>
              <span className="chip font-mono">士气 {momentum.morale >= 0 ? '+' : ''}{momentum.morale.toFixed(1)}</span>
              <span className="chip font-mono">教练信任 {momentum.coach >= 0 ? '+' : ''}{momentum.coach.toFixed(1)}</span>
            </div>
          </Card>
        ) : null}
      </div>
    )
  }

  const momentum = moments.reduce(
    (total, moment) => {
      const delta = momentDelta(moment)
      return {
        rating: total.rating + delta.rating,
        morale: total.morale + delta.morale,
        coach: total.coach + delta.coach,
      }
    },
    { rating: 0, morale: 0, coach: 0 },
  )
  const successCount = moments.filter((moment) => moment.outcome?.success).length

  return (
    <div className="page-pad pb-6">
      {backButton}

      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-accent">Matchday</p>
          <h1 className="text-xl font-semibold text-text">比赛日</h1>
        </div>
        {match ? (
          <span className="chip">
            {formatSeasonLabel(match.season)} · 第 {match.week} 周
          </span>
        ) : null}
      </div>

      {match ? (
        <>
          <Card className="mb-3 overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-line-soft px-4 py-2.5 text-[10px] text-dim">
              <span className="flex items-center gap-1.5">
                <CalendarDays size={12} /> {world.clubs[match.homeId]?.stadium ?? club.stadium}
              </span>
              <span>{match.attendance.toLocaleString('zh-CN')} 名观众</span>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-6">
              <p className={clsx('min-w-0 text-center text-sm font-medium', match.homeId === club.id ? 'text-accent' : 'text-text')}>
                {match.homeName}
              </p>
              <p className="font-mono text-3xl font-semibold tabular-nums text-text">
                {match.homeGoals} - {match.awayGoals}
              </p>
              <p className={clsx('min-w-0 text-center text-sm font-medium', match.awayId === club.id ? 'text-accent' : 'text-text')}>
                {match.awayName}
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-line-soft px-4 py-2.5 text-[10px] text-muted">
              <span>全场结束</span>
              <span className="flex items-center gap-1">
                <Award size={12} className="text-gold" /> 最佳：{match.motmName}（{formatRating(match.motmRating)}）
              </span>
            </div>
          </Card>

          <Card className={clsx('mb-4', match.userPlayed ? 'border-accent/25' : '')}>
            <SectionTitle>你的表现</SectionTitle>
            {match.userPlayed ? (
              <>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className={clsx('font-mono text-4xl font-semibold leading-none', ratingTone(match.userRating))}>
                      {formatRating(match.userRating)}
                    </p>
                    <p className="mt-1 text-[10px] text-dim">赛后评分</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-right">
                    <div>
                      <p className="font-mono text-lg text-text">{match.userMinutes}&apos;</p>
                      <p className="text-[10px] text-dim">分钟</p>
                    </div>
                    <div>
                      <p className="font-mono text-lg text-text">{match.userGoals}</p>
                      <p className="text-[10px] text-dim">进球</p>
                    </div>
                    <div>
                      <p className="font-mono text-lg text-text">{match.userAssists}</p>
                      <p className="text-[10px] text-dim">助攻</p>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-muted">
                  {match.userStarted ? '首发登场' : '替补登场'} ·{' '}
                  {match.userPosition ? POSITION_LABELS[match.userPosition] : '—'}
                  {match.userRating != null && match.userRating >= 7.5
                    ? ' · 一场值得记住的比赛。'
                    : match.userRating != null && match.userRating < 6.2
                      ? ' · 这不是你想要的夜晚。'
                      : ' · 稳定完成教练布置的任务。'}
                </p>
                {moments.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="chip font-mono">
                      关键回合 {successCount}/{moments.length}
                    </span>
                    <span className="chip font-mono">评分 {momentum.rating >= 0 ? '+' : ''}{momentum.rating.toFixed(1)}</span>
                    <span className="chip font-mono">士气 {momentum.morale >= 0 ? '+' : ''}{momentum.morale.toFixed(1)}</span>
                    <span className="chip font-mono">教练信任 {momentum.coach >= 0 ? '+' : ''}{momentum.coach.toFixed(1)}</span>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex items-start gap-3">
                <UserX size={20} className="mt-0.5 shrink-0 text-dim" />
                <div>
                  <p className="text-sm text-text">本场没有获得出场机会</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">
                    教练选择了其他球员。训练状态、教练信任和比赛锐度都会影响下一次的选择。
                  </p>
                </div>
              </div>
            )}
          </Card>

          {match.mediaReaction ? (
            <Card className="mb-4 border-line-soft p-3">
              <div className="flex items-start gap-2">
                <Sparkles size={14} className="mt-0.5 shrink-0 text-teal" />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-dim">媒体反应</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">{match.mediaReaction}</p>
                </div>
              </div>
            </Card>
          ) : null}

          {moments.length > 0 ? (
            <section className="mb-4">
              <SectionTitle
                right={
                  <span className="chip">
                    {successCount}/{moments.length} 成功
                  </span>
                }
              >
                关键回合回顾
              </SectionTitle>
              <div className="space-y-1.5">
                {moments.map((moment) => (
                  <div
                    key={moment.id}
                    className={clsx(
                      'flex items-start gap-2.5 rounded-xl border px-3 py-2',
                      moment.outcome?.success
                        ? 'border-teal/30 bg-teal/5'
                        : 'border-danger/25 bg-danger/5',
                    )}
                  >
                    {moment.outcome?.success ? (
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-teal" />
                    ) : (
                      <XCircle size={14} className="mt-0.5 shrink-0 text-danger" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] text-dim">
                        {moment.minute}&apos; · {moment.titleZh}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-text">{moment.outcome?.textZh}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mb-4">
            <SectionTitle>文字直播</SectionTitle>
            <div className="space-y-1.5">
              {match.events.map((event, index) => (
                <div
                  key={`${event.minute}-${index}`}
                  className={clsx(
                    'flex items-start gap-2.5 rounded-xl border px-3 py-2',
                    EVENT_TONE[event.type] ?? 'border-line bg-card-2 text-muted',
                    event.isUser && 'ring-1 ring-inset ring-accent/20',
                  )}
                >
                  <span className="w-7 shrink-0 pt-0.5 text-right font-mono text-[10px] tabular-nums opacity-70">
                    {event.minute}&apos;
                  </span>
                  <p className="text-[11px] leading-relaxed">{event.text}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <Card className="mb-4 p-6 text-center">
          <p className="text-sm font-medium text-text">还没有比赛记录</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            在主页安排本周训练并推进，比赛结束后这里会出现完整的过程与评分。
          </p>
        </Card>
      )}

      {next && opponent ? (
        <button
          type="button"
          className="card flex w-full items-center justify-between gap-3 p-4 text-left"
          onClick={() => navigate('/game')}
        >
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-dim">下一场</p>
            <p className="mt-0.5 text-sm font-medium text-text">
              第 {next.week} 周 · {next.homeId === club.id ? '主场' : '客场'} vs {opponent.nameZh}
            </p>
          </div>
          <ChevronRight size={16} className="text-dim" />
        </button>
      ) : null}
    </div>
  )
}
