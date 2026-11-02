import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { absoluteDay, holdingsValue, unrealizedGain } from '../../domain'
import { formatDayLabel, formatMoney, formatMoneyShort } from '../../lib'
import { useGameStore } from '../../store'
import { Card, EmptyState, SectionTitle } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { FinanceOverview } from './finance/FinanceOverview'
import { HoldingsList } from './finance/HoldingsList'
import { InvestSheet } from './finance/InvestSheet'

const LEDGER_KEEP = 12

function ledgerRow(entry: { season: number; week: number; type: string; amount: number; label: string }) {
  return (
    <li key={`${entry.season}:${entry.week}:${entry.label}`} className="flex items-center justify-between gap-3 py-1.5">
      <span className="min-w-0 truncate text-[12px] text-muted">{entry.label}</span>
      <span className={`shrink-0 font-mono text-[12px] ${entry.amount < 0 ? 'text-warn' : 'text-accent'}`}>
        {formatMoney(entry.amount)}
      </span>
    </li>
  )
}

export function FinanceScreen() {
  const world = useGameStore((state) => state.world)
  const redeemInvestment = useGameStore((state) => state.redeemInvestment)
  const [sheetOpen, setSheetOpen] = useState(false)

  if (!world) return null

  const finance = world.finance
  const holdings = finance.investments
  const total = holdingsValue(holdings)
  const gain = unrealizedGain(holdings)
  const today = absoluteDay(world.week, world.day)

  return (
    <div className="page-pad pb-6 sm:mx-auto sm:max-w-[760px]">
      <PageHeader
        eyebrow={formatDayLabel(world.season, world.week, world.day)}
        title="资金运用"
        subtitle="投出去的钱离开余额，涨跌只算浮盈，赎回才回到可用余额。"
        right={<span className="chip font-mono">{formatMoney(finance.balance)}</span>}
      />

      <FinanceOverview pendingIncome={finance.pendingIncome} pendingExpenses={finance.pendingExpenses} />

      <button type="button" className="btn-primary mb-3 w-full" onClick={() => setSheetOpen(true)}>
        <Wallet size={16} />
        把钱投出去
      </button>

      <section aria-label="持仓" className="mb-3 min-w-0">
        <SectionTitle>投出去的钱</SectionTitle>
        <Card>
          {holdings.length === 0 ? (
            <EmptyState title="还没有投出去的钱" body="工资与赞助按天累计、周日入账；开仓后这笔钱就离开余额，涨跌只挂在现值上。" />
          ) : (
            <HoldingsList
              investments={holdings}
              total={total}
              gain={gain}
              today={today}
              onRedeem={(investmentId) => void redeemInvestment(investmentId)}
            />
          )}
        </Card>
      </section>

      <section aria-label="最近账目" className="mb-3 min-w-0">
        <SectionTitle right={<span className="chip">总资产 {formatMoneyShort(finance.balance + total)}</span>}>账本</SectionTitle>
        <Card>
          {finance.ledger.length === 0 ? (
            <p className="text-[12px] text-muted">这个存档还没有账目。</p>
          ) : (
            <ul className="divide-y divide-line">{finance.ledger.slice(0, LEDGER_KEEP).map(ledgerRow)}</ul>
          )}
        </Card>
      </section>

      <InvestSheet open={sheetOpen} world={world} onClose={() => setSheetOpen(false)} />
    </div>
  )
}
