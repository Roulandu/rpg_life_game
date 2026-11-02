import type { Investment } from '../../../domain'
import { formatMoney } from '../../../lib'

function rateLabel(rateBps: number): string {
  return `年化 ${(rateBps / 100).toFixed(1)}%`
}

function signedMoney(value: number): string {
  return value < 0 ? `-${formatMoney(-value)}` : `+${formatMoney(value)}`
}

/** 一行持仓：现值与本金的差只在波动品种上出现，活期不假装自己在涨。 */
export function HoldingRow({ investment, today }: { investment: Investment; today: number }) {
  const current = investment.value ?? investment.principal
  const gain = investment.value === undefined ? null : investment.value - investment.principal
  const term = investment.termDays ?? 0
  const left = Math.max(0, term - (today - investment.openedDay))

  return (
    <li aria-label={`持仓 ${investment.name}`} className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-[13px] text-text">{investment.name}</p>
        <p className="mt-0.5 flex flex-wrap gap-x-1.5 text-[10px] text-muted">
          <span>{term > 0 ? `锁定期还剩 ${left} 天` : '随取随用'}</span>
          <span>{rateLabel(investment.rateBps)}</span>
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-mono text-[13px] text-text">{formatMoney(current)}</p>
        {gain === null ? null : (
          <p className={`mt-0.5 font-mono text-[10px] ${gain < 0 ? 'text-warn' : 'text-accent'}`}>{signedMoney(gain)}</p>
        )}
      </div>
    </li>
  )
}
