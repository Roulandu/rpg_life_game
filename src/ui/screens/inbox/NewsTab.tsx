import { Newspaper } from 'lucide-react'
import type { NewsItem } from '../../../domain/types'
import { formatSeasonLabel } from '../../../lib/format'
import { Card, EmptyState } from '../../components/Card'

const NEWS_KIND_LABEL: Record<string, string> = {
  match: '比赛',
  transfer: '转会',
  media: '媒体',
  club: '俱乐部',
  award: '荣誉',
  system: '系统',
}

export function NewsTab({ news }: { news: NewsItem[] }) {
  if (news.length === 0) {
    return <EmptyState title="还没有新闻" body="比赛、转会与荣誉都会出现在这里。" />
  }
  return (
    <div className="space-y-1.5">
      {news.map((item) => (
        <Card key={item.id} className="flex items-start gap-2.5 p-3">
          <Newspaper size={14} className="mt-0.5 shrink-0 text-dim" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-xs font-medium text-text">{item.title}</p>
              <span className="chip shrink-0">{NEWS_KIND_LABEL[item.kind] ?? item.kind}</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">{item.body}</p>
            <p className="mt-1 text-[9px] text-dim">
              {formatSeasonLabel(item.season)} · 第 {item.week} 周
            </p>
          </div>
        </Card>
      ))}
    </div>
  )
}
