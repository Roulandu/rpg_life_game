import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { MatchReport } from '../../../domain'
import { formatSeasonLabel } from '../../../lib'

export function MatchdayHeader({ title, match }: { title: string; match: MatchReport | null }) {
  const navigate = useNavigate()

  return (
    <>
      <button type="button" className="btn-ghost -ml-2 mb-3 px-2" onClick={() => navigate('/game')}>
        <ArrowLeft size={16} /> 回到主页
      </button>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-accent">Matchday</p>
          <h1 className="text-xl font-semibold text-text">{title}</h1>
        </div>
        {match ? (
          <span className="chip">
            {formatSeasonLabel(match.season)} · 第 {match.week} 周
          </span>
        ) : null}
      </div>
    </>
  )
}
