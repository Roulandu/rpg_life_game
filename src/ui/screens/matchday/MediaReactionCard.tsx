import { Sparkles } from 'lucide-react'
import { Card } from '../../components/Card'

export function MediaReactionCard({ text }: { text: string }) {
  return (
    <Card className="mb-4 border-line-soft p-3">
      <div className="flex items-start gap-2">
        <Sparkles size={14} className="mt-0.5 shrink-0 text-teal" />
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-dim">媒体反应</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">{text}</p>
        </div>
      </div>
    </Card>
  )
}
