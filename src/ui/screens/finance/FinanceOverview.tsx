import { formatMoney } from '../../../lib'
import { Card } from '../../components/Card'

/** 待入账的累计器：一周一条流水，所以「这周到现在挣了多少、花了多少」只能在这里读。 */
export function FinanceOverview({
  pendingIncome,
  pendingExpenses,
}: {
  pendingIncome: number
  pendingExpenses: number
}) {
  const income = Math.round(pendingIncome)
  const expenses = Math.round(pendingExpenses)
  const net = income - expenses

  return (
    <section aria-label="本周累计" className="mb-3 min-w-0">
      <Card className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[10px] text-dim">本周已挣</p>
          <p className="mt-1 font-mono text-sm text-text">{formatMoney(income)}</p>
        </div>
        <div>
          <p className="text-[10px] text-dim">本周已花</p>
          <p className="mt-1 font-mono text-sm text-text">{formatMoney(expenses)}</p>
        </div>
        <div>
          <p className="text-[10px] text-dim">待入账净额</p>
          <p className={`mt-1 font-mono text-sm ${net < 0 ? 'text-warn' : 'text-accent'}`}>
            {net < 0 ? `-${formatMoney(-net)}` : formatMoney(net)}
          </p>
        </div>
      </Card>
    </section>
  )
}
