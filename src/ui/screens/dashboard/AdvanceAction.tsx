import { useNavigate } from 'react-router-dom'
import { ArrowRight, CalendarClock, LoaderCircle, Sparkles } from 'lucide-react'
import { Card } from '../../components/Card'

function RetiredCard() {
  const navigate = useNavigate()
  return (
    <Card className="mb-3 border-gold/30" data-dashboard-block="advance">
      <p className="text-sm font-medium text-gold">你已经挂靴</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        球员生涯已经结束。你仍然可以查看档案、时间线与本赛季的最终数据。
      </p>
      <button type="button" className="btn-secondary mt-3 w-full" onClick={() => navigate('/timeline')}>
        查看生涯时间线
      </button>
    </Card>
  )
}

function PendingMatchButton({
  resolvedMoments,
  totalMoments,
}: {
  resolvedMoments: number
  totalMoments: number
}) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      className="btn-primary mb-4 w-full"
      data-dashboard-block="advance"
      onClick={() => navigate('/match')}
    >
      <Sparkles size={16} /> 继续比赛日 · {resolvedMoments}/{totalMoments}
    </button>
  )
}

function DayAdvanceControls({
  busy,
  daysToMatch,
  onFastForward,
  onAdvanceDay,
  onPlan,
}: {
  busy: boolean
  daysToMatch: number | null
  onFastForward: () => void
  onAdvanceDay: () => void
  onPlan: () => void
}) {
  return (
    <div className="mb-4" data-dashboard-block="advance">
      <div className="flex gap-2">
        <button type="button" className="btn-primary min-h-[44px] flex-1" disabled={busy} onClick={onFastForward}>
          {busy ? <LoaderCircle size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          {busy ? '正在推进…' : '推进到下一件事'}
        </button>
        <button
          type="button"
          className="btn-secondary min-h-[44px] shrink-0 px-3"
          disabled={busy}
          onClick={onAdvanceDay}
        >
          <CalendarClock size={16} /> 推进一天
        </button>
      </div>
      <p className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted">
        <span>{daysToMatch == null ? '本周没有比赛' : `距上场 ${daysToMatch} 天`}</span>
        <button type="button" className="shrink-0 text-accent" onClick={onPlan}>
          安排本周
        </button>
      </p>
    </div>
  )
}

export function AdvanceAction({
  retired,
  pendingMatch,
  resolvedMoments,
  totalMoments,
  busy,
  daysToMatch,
  onFastForward,
  onAdvanceDay,
  onPlan,
}: {
  retired: boolean
  pendingMatch: boolean
  resolvedMoments: number
  totalMoments: number
  busy: boolean
  daysToMatch: number | null
  onFastForward: () => void
  onAdvanceDay: () => void
  onPlan: () => void
}) {
  if (retired) return <RetiredCard />
  if (pendingMatch) return <PendingMatchButton resolvedMoments={resolvedMoments} totalMoments={totalMoments} />
  return (
    <DayAdvanceControls
      busy={busy}
      daysToMatch={daysToMatch}
      onFastForward={onFastForward}
      onAdvanceDay={onAdvanceDay}
      onPlan={onPlan}
    />
  )
}
