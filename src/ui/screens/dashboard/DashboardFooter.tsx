import { Trophy, Wallet } from 'lucide-react'
import { formatMoneyShort, formatWeekLabel } from '../../../lib'

export function DashboardFooter({ balance, season, week }: { balance: number; season: number; week: number }) {
  return (
    <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-dim">
      <span className="flex items-center gap-1">
        <Wallet size={12} /> {formatMoneyShort(balance)}
      </span>
      <span className="flex items-center gap-1">
        <Trophy size={12} /> {formatWeekLabel(season, week)}
      </span>
    </div>
  )
}
