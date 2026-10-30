import type { Player, WorldState } from '../../../domain'
import { overall } from '../../../domain'
import { formatMoney, formatMoneyShort, formatSeasonLabel } from '../../../lib'
import { Card, SectionTitle } from '../../components/Card'
import { StatBar } from '../../components/StatBar'

export function ProfileFinance({ world, user }: { world: WorldState; user: Player }) {
  const headroom = user.potential - overall(user)
  const scouting =
    headroom >= 15
      ? '球探认为你还有巨大的成长空间。'
      : headroom >= 8
        ? '你仍有明显的提升空间，尤其是稳定性和比赛阅读。'
        : headroom >= 3
          ? '你正在接近成熟期，细节决定上限。'
          : '你已非常接近自己的潜力上限。'

  return (
    <div className="min-w-0">
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Card className="p-3">
          <p className="text-[10px] text-dim">周薪</p>
          <p className="mt-1 font-mono text-lg text-text">{formatMoneyShort(user.contract.wageWeekly)}</p>
          <p className="mt-1 text-[10px] text-muted">合同至 {formatSeasonLabel(user.contract.endSeason)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] text-dim">身价</p>
          <p className="mt-1 font-mono text-lg text-accent">{formatMoneyShort(user.value)}</p>
          <p className="mt-1 text-[10px] text-muted">余额 {formatMoney(world.finance.balance)}</p>
        </Card>
      </div>

      <section className="mb-3">
        <SectionTitle right={<span className="chip">潜力评估</span>}>球探报告</SectionTitle>
        <Card className="p-4">
          <p className="text-[12px] leading-relaxed text-muted">{scouting}</p>
          <div className="mt-3">
            <StatBar label="当前能力" value={overall(user)} max={Math.max(user.potential, overall(user))} tone="accent" />
            <p className="mt-1.5 text-[10px] text-dim">潜力上限不会被直接显示。表现越好，球探的判断越接近真实。</p>
          </div>
        </Card>
      </section>
    </div>
  )
}
