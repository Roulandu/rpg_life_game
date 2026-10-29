import { Sparkles } from 'lucide-react'
import { Card } from '../../components/Card'

export function PendingMomentsCard({ pendingCount }: { pendingCount: number }) {
  return (
    <Card className="mb-3 border-teal/30 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-teal">
        <Sparkles size={12} /> 等待你做出关键回合的选择
      </p>
      <p className="mt-1 text-[10px] leading-relaxed text-muted">
        本周的比赛尚未结束，GM 会在比赛日完成后撰写叙事。完成剩余 {pendingCount} 个关键回合即可继续推进。
      </p>
    </Card>
  )
}
