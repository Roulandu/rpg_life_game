import { Wallet } from 'lucide-react'
import type { WorldState } from '../../../domain/types'
import { Card, SectionTitle } from '../../components/Card'

export function UsageSection({ usage }: { usage: NonNullable<WorldState['aiUsage']> }) {
  return (
    <section className="mb-3">
      <SectionTitle right={<Wallet size={14} className="text-muted" />}>AI 用量</SectionTitle>
      <Card className="space-y-2">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] text-dim">调用</p>
            <p className="font-mono text-lg text-text">{usage.calls}</p>
          </div>
          <div>
            <p className="text-[10px] text-dim">输入 / 输出</p>
            <p className="font-mono text-sm text-text">
              {usage.promptTokens} / {usage.completionTokens}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-dim">估算费用</p>
            <p className="font-mono text-lg text-accent">${usage.costUsd.toFixed(4)}</p>
          </div>
        </div>
        <p className="text-[10px] leading-relaxed text-dim">
          费用按可编辑价格表估算，实际以供应商账单为准。叙事关闭或回退模板时不会产生调用。
        </p>
      </Card>
    </section>
  )
}
