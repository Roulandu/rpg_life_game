import { useNavigate } from 'react-router-dom'
import { Newspaper } from 'lucide-react'
import type { NewsItem } from '../../../domain'
import { Card, SectionTitle } from '../../components/Card'

const NEWS_KIND_LABEL: Record<string, string> = {
  match: '比赛',
  transfer: '转会',
  media: '媒体',
  club: '俱乐部',
  award: '荣誉',
  system: '系统',
}

export function NewsFeed({ news }: { news: NewsItem[] }) {
  const navigate = useNavigate()

  return (
    <section>
      <SectionTitle
        right={
          <button type="button" className="text-[11px] text-muted hover:text-text" onClick={() => navigate('/inbox')}>
            全部消息
          </button>
        }
      >
        最新动态
      </SectionTitle>
      <div className="space-y-1.5">
        {news.length === 0 ? (
          <Card className="p-4 text-center text-xs text-muted">暂无新闻。推进一周后，这里会热闹起来。</Card>
        ) : (
          news.map((item) => (
            <Card key={item.id} className="flex items-start gap-2.5 p-3">
              <Newspaper size={14} className="mt-0.5 shrink-0 text-dim" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="chip px-1.5 py-0 text-[9px]">{NEWS_KIND_LABEL[item.kind] ?? item.kind}</span>
                  <p className="truncate text-[12px] font-medium text-text">{item.title}</p>
                </div>
                <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted">{item.body}</p>
              </div>
            </Card>
          ))
        )}
      </div>
    </section>
  )
}
