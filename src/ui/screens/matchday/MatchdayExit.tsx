import { useNavigate } from 'react-router-dom'
import { House } from 'lucide-react'
import type { WorldState } from '../../../domain'
import { nextFixtureOf, opponentOfClub } from '../../gameHelpers'

export function MatchdayExit({ world, clubId }: { world: WorldState; clubId: string }) {
  const navigate = useNavigate()
  const next = nextFixtureOf(world, clubId)
  const opponent = next ? opponentOfClub(world, next, clubId) : null

  return (
    <div>
      {next && opponent ? (
        <p className="mb-2 px-1 text-[11px] text-muted">
          下一场：第 {next.week} 周 · {next.homeId === clubId ? '主场' : '客场'} vs {opponent.nameZh}
        </p>
      ) : null}
      <button type="button" className="btn-primary w-full" onClick={() => navigate('/game')}>
        <House size={16} /> 返回主页
      </button>
    </div>
  )
}
