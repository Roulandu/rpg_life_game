import { MessageCircle } from 'lucide-react'
import { Card } from '../../components/Card'

export function ChatIntro({ usedActionLabel }: { usedActionLabel: string | null }) {
  return (
    <Card className="p-3 md:shrink-0">
      <div className="flex items-start gap-2">
        <MessageCircle size={14} className="mt-0.5 shrink-0 text-teal" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] leading-relaxed text-muted">
            用自然语言告诉 GM 你想做什么，比如“去找教练谈谈我的位置”。对话可以影响关系与状态，但不会改变比分、合同或赛程。
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-dim">
            每周最多执行 1 个带数值效果的行动；本周
            {usedActionLabel ? `已使用「${usedActionLabel}」。` : '尚未使用。'}
          </p>
        </div>
      </div>
    </Card>
  )
}
