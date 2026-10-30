import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useGameStore } from '../../store'
import { CareerHistory } from './profile/CareerHistory'
import { ProfileFinance } from './profile/ProfileFinance'
import { ProfileOverview } from './profile/ProfileOverview'
import { ProfileSeason } from './profile/ProfileSeason'

export function ProfileScreen() {
  const navigate = useNavigate()
  const world = useGameStore((state) => state.world)
  if (!world) return null

  const user = world.players[world.playerId]
  const club = world.clubs[world.clubId]

  return (
    <div className="page-pad pb-6 sm:mx-auto sm:max-w-[960px] lg:max-w-none">
      <button type="button" className="btn-ghost -ml-2 mb-3 px-2" onClick={() => navigate('/game')}>
        <ArrowLeft size={16} /> 回到主页
      </button>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
        <ProfileOverview user={user} clubName={club.nameZh} />
        <div className="min-w-0">
          <ProfileFinance world={world} user={user} />
          <ProfileSeason world={world} user={user} />
        </div>
      </div>

      <CareerHistory user={user} />
    </div>
  )
}
