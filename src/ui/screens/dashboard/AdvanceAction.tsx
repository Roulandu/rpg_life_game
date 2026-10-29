import { useNavigate } from 'react-router-dom'
import { ArrowRight, LoaderCircle, Sparkles } from 'lucide-react'
import { Card } from '../../components/Card'

export function AdvanceAction({
  retired,
  pendingMatch,
  resolvedMoments,
  totalMoments,
  busy,
  week,
  onPlan,
}: {
  retired: boolean
  pendingMatch: boolean
  resolvedMoments: number
  totalMoments: number
  busy: boolean
  week: number
  onPlan: () => void
}) {
  const navigate = useNavigate()

  if (retired) {
    return (
      <Card className="mb-3 border-gold/30">
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

  if (pendingMatch) {
    return (
      <button type="button" className="btn-primary mb-4 w-full" onClick={() => navigate('/match')}>
        <Sparkles size={16} /> 继续比赛日 · {resolvedMoments}/{totalMoments}
      </button>
    )
  }

  return (
    <button type="button" className="btn-primary mb-4 w-full" disabled={busy} onClick={onPlan}>
      {busy ? <LoaderCircle size={16} className="animate-spin" /> : <ArrowRight size={16} />}
      {busy ? '正在模拟本周…' : `安排并推进第 ${week} 周`}
    </button>
  )
}
