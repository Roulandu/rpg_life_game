import type { Player } from '../../../domain'
import { Card } from '../../components/Card'
import { StatBar } from '../../components/StatBar'

export function PlayerFormCard({ user }: { user: Player }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-2">
      <Card className="p-3">
        <StatBar label="体能" value={user.fitness} />
        <StatBar label="士气" value={user.morale} className="mt-2" />
      </Card>
      <Card className="p-3">
        <StatBar label="锐度" value={user.sharpness} />
        <StatBar label="状态" value={user.form} className="mt-2" />
      </Card>
    </div>
  )
}
