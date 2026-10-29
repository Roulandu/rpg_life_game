import { useNavigate } from 'react-router-dom'
import { Award, TrendingDown, TrendingUp } from 'lucide-react'
import { useGameStore } from '../../store'
import { formatSeasonLabel } from '../../lib'
import { Modal } from './Modal'

export function SeasonSummaryModal() {
  const transition = useGameStore((state) => state.seasonTransition)
  const dismiss = useGameStore((state) => state.dismissSeason)
  const navigate = useNavigate()

  if (!transition) return null

  const { summary } = transition
  return (
    <Modal
      open
      dismissible={false}
      title={summary.season ? `${formatSeasonLabel(summary.season)} 赛季结束` : '赛季结束'}
      description={`${summary.clubName} · 联赛第 ${summary.leaguePosition || '—'} 名`}
      onClose={dismiss}
      footer={
        <div className="flex flex-col gap-2">
          {transition.retired ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                dismiss()
                navigate('/timeline')
              }}
            >
              查看生涯时间线
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={dismiss}>
              开始 {formatSeasonLabel(transition.newSeason)} 赛季
            </button>
          )}
          <button type="button" className="btn-ghost" onClick={dismiss}>
            关闭
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-4 gap-2 rounded-2xl border border-line-soft bg-card-2/80 p-3 text-center">
        <Stat label="出场" value={summary.appearances} />
        <Stat label="进球" value={summary.goals} />
        <Stat label="助攻" value={summary.assists} />
        <Stat label="评分" value={summary.averageRating > 0 ? summary.averageRating.toFixed(1) : '—'} />
      </div>

      {transition.awards.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {transition.awards.map((award) => (
            <span key={award} className="chip border-gold/30 text-gold">
              <Award size={12} /> {award}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 space-y-2 text-xs leading-relaxed text-muted">
        {transition.promoted ? (
          <p className="flex items-center gap-1.5 text-accent">
            <TrendingUp size={14} /> 你和球队一起升级了。
          </p>
        ) : null}
        {transition.relegated ? (
          <p className="flex items-center gap-1.5 text-danger">
            <TrendingDown size={14} /> 球队不幸降级。
          </p>
        ) : null}
        {transition.retired ? (
          <p className="text-gold">你宣布退役，球员生涯在这里画上句号。</p>
        ) : (
          <p>新赛季赛程已经生成，合同、年龄与状态都会继续变化。</p>
        )}
        {summary.note ? <p>{summary.note}</p> : null}
      </div>
    </Modal>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="font-mono text-lg font-semibold tabular-nums text-text">{value}</p>
      <p className="mt-0.5 text-[10px] text-dim">{label}</p>
    </div>
  )
}
