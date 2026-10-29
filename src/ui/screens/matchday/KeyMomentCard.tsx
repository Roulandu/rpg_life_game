import { FastForward } from 'lucide-react'
import type { KeyMoment } from '../../../domain'
import { Card } from '../../components/Card'

export function KeyMomentCard({
  active,
  acting,
  onChoose,
  onSkip,
}: {
  active: KeyMoment
  acting: boolean
  onChoose: (momentId: string, optionId: string) => void
  onSkip: () => void
}) {
  return (
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
            onClick={() => onChoose(active.id, option.id)}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-text">{option.labelZh}</span>
              <span className="chip shrink-0 font-mono text-[10px]">成功率 {Math.round(option.successChance * 100)}%</span>
            </span>
            <span className="mt-0.5 block text-[10px] leading-relaxed text-muted">{option.descriptionZh}</span>
          </button>
        ))}
      </div>
      <button type="button" className="btn-ghost mt-2 w-full justify-center text-[11px]" disabled={acting} onClick={onSkip}>
        <FastForward size={13} /> 跳过剩余回合（按稳妥选择处理）
      </button>
    </Card>
  )
}
