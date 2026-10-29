import { Card } from '../../components/Card'
import type { Momentum } from './matchdayUtils'

function signed(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}`
}

export function MomentumChips({ momentum }: { momentum: Momentum }) {
  return (
    <>
      <span className="chip font-mono">评分 {signed(momentum.rating)}</span>
      <span className="chip font-mono">士气 {signed(momentum.morale)}</span>
      <span className="chip font-mono">教练信任 {signed(momentum.coach)}</span>
    </>
  )
}

export function MomentumCard({ momentum }: { momentum: Momentum }) {
  return (
    <Card className="p-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-dim">到目前为止的影响</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <MomentumChips momentum={momentum} />
      </div>
    </Card>
  )
}
