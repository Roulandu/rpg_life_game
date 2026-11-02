import type { Investment } from '../../../domain'
import { formatMoney } from '../../../lib'
import { HoldingRow } from './HoldingRow'

function signedMoney(value: number): string {
  return value < 0 ? `-${formatMoney(-value)}` : `+${formatMoney(value)}`
}

/** 持仓区：合计与逐行现值走同一份口径（`value ?? principal`），界面不需要知道哪个品种不波动。 */
export function HoldingsList({
  investments,
  total,
  gain,
  today,
  onRedeem,
}: {
  investments: Investment[]
  total: number
  gain: number
  today: number
  onRedeem: (investmentId: string) => void
}) {
  return (
    <>
      <ul className="divide-y divide-line">
        {investments.map((investment) => (
          <HoldingRow key={investment.id} investment={investment} today={today} onRedeem={onRedeem} />
        ))}
      </ul>
      <div
        role="group"
        aria-label="现值合计"
        className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-2 text-[11px] text-dim"
      >
        <span>现值合计</span>
        <span className="font-mono text-text">
          <span>{formatMoney(total)}</span>
          {gain === 0 ? null : (
            <span className={gain < 0 ? ' ml-1.5 text-warn' : ' ml-1.5 text-accent'}>{signedMoney(gain)}</span>
          )}
        </span>
      </div>
    </>
  )
}
