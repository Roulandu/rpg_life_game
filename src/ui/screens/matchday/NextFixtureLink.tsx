import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { Club, Fixture } from '../../../domain'

export function NextFixtureLink({ next, opponent, isHome }: { next: Fixture; opponent: Club; isHome: boolean }) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      className="card flex w-full items-center justify-between gap-3 p-4 text-left"
      onClick={() => navigate('/game')}
    >
      <div>
        <p className="text-[10px] uppercase tracking-[0.14em] text-dim">下一场</p>
        <p className="mt-0.5 text-sm font-medium text-text">
          第 {next.week} 周 · {isHome ? '主场' : '客场'} vs {opponent.nameZh}
        </p>
      </div>
      <ChevronRight size={16} className="text-dim" />
    </button>
  )
}
