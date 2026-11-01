import { STYLE_LABELS, styleAdvice, styleFit, styleFitLabel } from '../../../domain'
import type { Club, Player, Relationship } from '../../../domain'
import { StatBar } from '../../components/StatBar'

interface PlayerStyleCardProps {
  player: Player
  club: Club
  relationship?: Relationship
}

export function PlayerStyleCard({ player, club, relationship }: PlayerStyleCardProps) {
  const fit = styleFit(player, club.style)
  const label = styleFitLabel(fit)

  return (
    <section className="card mb-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-title">与教练打法的匹配</h2>
        <span className="chip shrink-0">{label}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        {styleAdvice(club.style, fit)}（{STYLE_LABELS[club.style]}）
      </p>
      <div className="mt-3">
        <StatBar label="契合度" value={Math.round(fit * 100)} hint={`${Math.round(fit * 100)}%`} />
      </div>
      <p className="mt-2 text-[11px] text-dim">主教练：{club.coach.nameZh}</p>

      {relationship ? (
        <div className="mt-4 border-t border-line-soft pt-3">
          <p className="text-[11px] text-muted">{relationship.summary}</p>
          <div className="mt-2 grid gap-2">
            <StatBar label="与你的信任" value={relationship.trust} tone="teal" />
            <StatBar label="紧张度" value={relationship.tension} tone="danger" />
          </div>
        </div>
      ) : null}
    </section>
  )
}
