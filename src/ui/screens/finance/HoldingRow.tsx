import type { Investment } from '../../../domain'
import { formatMoney } from '../../../lib'

interface RowCopy {
  current: number
  gain: number | null
  lock: string
  fee: string | null
  action: string
}

/** 把「这行该念什么」先算成字符串，组件里就只剩渲染，不再叠三层三元。 */
function rowCopy(investment: Investment, today: number): RowCopy {
  const term = investment.termDays ?? 0
  const fee = investment.earlyExitFee ?? 0
  const left = Math.max(0, term - (today - investment.openedDay))
  const locked = term > 0 && left > 0

  return {
    current: investment.value ?? investment.principal,
    gain: investment.value === undefined ? null : investment.value - investment.principal,
    lock: term > 0 ? `锁定期还剩 ${left} 天` : '随取随用',
    fee: locked && fee > 0 ? `提前赎回要付罚息（${(fee * 100).toFixed(0)}%）` : null,
    action: locked ? '赎回' : '取出',
  }
}

export function HoldingRow({
  investment,
  today,
  onRedeem,
}: {
  investment: Investment
  today: number
  onRedeem: (investmentId: string) => void
}) {
  const copy = rowCopy(investment, today)
  const rate = `年化 ${(investment.rateBps / 100).toFixed(1)}%`

  return (
    <li aria-label={`持仓 ${investment.name}`} className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-[13px] text-text">{investment.name}</p>
        <p className="mt-0.5 flex flex-wrap gap-x-1.5 text-[10px] text-muted">
          <span>{copy.lock}</span>
          <span>{rate}</span>
          {copy.fee ? <span className="text-gold">{copy.fee}</span> : null}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-mono text-[13px] text-text">{formatMoney(copy.current)}</p>
        {copy.gain === null ? null : (
          <p className={`mt-0.5 font-mono text-[10px] ${copy.gain < 0 ? 'text-warn' : 'text-accent'}`}>
            {copy.gain < 0 ? `-${formatMoney(-copy.gain)}` : `+${formatMoney(copy.gain)}`}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRedeem(investment.id)}
        aria-label={`${copy.action} ${investment.name}`}
        className="btn-secondary shrink-0 px-3 text-[11px]"
      >
        {copy.action}
      </button>
    </li>
  )
}
