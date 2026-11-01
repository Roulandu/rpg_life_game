import {
  ATTR_LABELS,
  STYLE_LABELS,
  STYLE_TRAINING_BONUS,
  TRAINING_LABELS,
  styleFit,
  styleFitLabel,
  styleTopAttrs,
} from '../../../domain'
import { displayName } from '../../../domain'
import type { Club, Player } from '../../../domain'

export function CoachCard({ club, user }: { club: Club; user: Player }) {
  const coach = club.coach
  const fit = styleFit(user, club.style)
  const focus = STYLE_TRAINING_BONUS[club.style]
  const attrs = styleTopAttrs(club.style).map((key) => ATTR_LABELS[key])

  return (
    <section className="card mb-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="section-title">教练组</h2>
          <p className="mt-1 truncate text-sm font-semibold text-text">{displayName(coach)}</p>
        </div>
        <span className="chip shrink-0">{coach.age} 岁</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="card-soft px-3 py-2">
          <p className="text-[10px] text-dim">执教评分</p>
          <p className="mt-0.5 font-mono text-sm text-text">{coach.quality}</p>
        </div>
        <div className="card-soft px-3 py-2">
          <p className="text-[10px] text-dim">一线队人数</p>
          <p className="mt-0.5 font-mono text-sm text-text">{club.squadIds.length}</p>
        </div>
      </div>

      <div className="mt-3 border-t border-line-soft pt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted">
            打法：<span className="text-text">{STYLE_LABELS[club.style]}</span>
          </p>
          <span className="chip shrink-0">{styleFitLabel(fit)}</span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-dim">
          {`教练看重${attrs.join('与')}，训练偏好「${TRAINING_LABELS[focus]}」。契合度决定出场顺位：不契合时同等状态下更难首发。`}
        </p>
      </div>
    </section>
  )
}
