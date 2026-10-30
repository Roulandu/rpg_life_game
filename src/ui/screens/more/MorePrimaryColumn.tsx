import { Landmark, Settings, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { WorldState } from '../../../domain'
import { formatMoney, formatMoneyShort } from '../../../lib'
import { Card, SectionTitle } from '../../components/Card'
import { MenuRow } from './MenuRow'

export function MorePrimaryColumn({ world }: { world: WorldState }) {
  const navigate = useNavigate()

  return (
    <>
      <Card className="mb-3 p-0">
        <MenuRow icon={<Landmark size={16} />} label="生涯时间线" hint="赛季记录与荣誉" onClick={() => navigate('/timeline')} />
        <MenuRow icon={<Settings size={16} />} label="设置" hint="AI、叙事与数据" onClick={() => navigate('/settings')} />
      </Card>

      <section className="mb-3">
        <SectionTitle>财务概览</SectionTitle>
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet size={16} className="text-accent" />
              <div>
                <p className="text-[10px] text-dim">可用余额</p>
                <p className="font-mono text-lg text-text">{formatMoney(world.finance.balance)}</p>
              </div>
            </div>
            <div className="text-right text-[10px] text-muted">
              <p>周薪 {formatMoneyShort(world.finance.weeklyWage)}</p>
              <p className="mt-0.5">周支出 {formatMoneyShort(world.finance.weeklyExpenses)}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {world.finance.assets.map((asset) => (
              <span key={asset} className="chip">
                {asset}
              </span>
            ))}
          </div>
        </Card>
      </section>
    </>
  )
}
