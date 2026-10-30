import { useNavigate } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import type { GameEvent } from '../../../domain'
import { Card, SectionTitle } from '../../components/Card'

export function InboxPreview({ openCount, latest }: { openCount: number; latest: GameEvent | undefined }) {
  const navigate = useNavigate()

  return (
    <section className="mb-4" data-dashboard-block="inbox">
      <SectionTitle
        right={
          openCount > 0 ? <span className="chip border-accent/30 text-accent">{openCount} 个待处理</span> : undefined
        }
      >
        收件箱
      </SectionTitle>
      {latest ? (
        <Card className="border-accent/25 p-4">
          <div className="flex items-start gap-2">
            <MessageSquare size={15} className="mt-0.5 shrink-0 text-accent" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-text">{latest.title}</p>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">{latest.body}</p>
            </div>
          </div>
          <button type="button" className="btn-secondary mt-3 w-full" onClick={() => navigate('/inbox')}>
            处理这周的事件
          </button>
        </Card>
      ) : (
        <Card className="p-4 text-center">
          <p className="text-xs text-muted">本周没有需要处理的私人事件。</p>
          <p className="mt-1 text-[10px] text-dim">训练与比赛仍然会继续改变你的生涯。</p>
        </Card>
      )}
    </section>
  )
}
