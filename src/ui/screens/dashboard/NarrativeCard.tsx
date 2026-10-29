import { AlertTriangle } from 'lucide-react'
import type { AiNarrative } from '../../../domain'
import { formatWeekLabel } from '../../../lib'
import { Card } from '../../components/Card'

export function NarrativeSkeleton() {
  return (
    <Card className="space-y-2 p-4" aria-live="polite">
      <div className="h-3 w-28 animate-pulse rounded bg-card-2" />
      <div className="h-2.5 w-full animate-pulse rounded bg-card-2" />
      <div className="h-2.5 w-5/6 animate-pulse rounded bg-card-2" />
      <p className="pt-1 text-[10px] text-dim">GM 正在撰写这周的故事，比赛与数值已经结算完毕。</p>
    </Card>
  )
}

export function NarrativeCard({ narrative, onContinue }: { narrative: AiNarrative; onContinue: () => void }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-text">{narrative.headline}</p>
        <span className="chip shrink-0 px-1.5 py-0 text-[9px] text-dim">
          {formatWeekLabel(narrative.season, narrative.week)}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-line text-[12px] leading-relaxed text-muted">{narrative.body}</p>
      {narrative.npcNote ? (
        <p className="mt-2 rounded-lg border border-line-soft bg-card-2/60 px-2.5 py-2 text-[11px] leading-relaxed text-muted">
          {narrative.npcNote}
        </p>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[10px] text-dim">
          {narrative.suggestedAction
            ? `可尝试：${narrative.suggestedAction}`
            : '叙事由 AI 生成，比赛与数值由引擎结算。'}
        </span>
        <button type="button" className="shrink-0 text-[10px] text-teal" onClick={onContinue}>
          继续对话
        </button>
      </div>
    </Card>
  )
}

export function AiErrorCard({ error, onDismiss }: { error: string; onDismiss: () => void }) {
  return (
    <Card className="mt-1.5 border-danger/25 p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-danger" />
        <p className="flex-1 text-[11px] leading-relaxed text-danger">{error}</p>
        <button type="button" className="shrink-0 text-[10px] text-dim" onClick={onDismiss}>
          知道了
        </button>
      </div>
    </Card>
  )
}
