import { formatSeasonLabel } from '../../../lib'
import { PageHeader } from '../../components/PageHeader'
import { InboxTabs } from './InboxTabs'
import type { InboxTab } from './inboxTab'

export function InboxHeader({
  season,
  openCount,
  tab,
  onChange,
}: {
  season: number
  openCount: number
  tab: InboxTab
  onChange: (tab: InboxTab) => void
}) {
  return (
    <div className="md:shrink-0">
      <PageHeader
        eyebrow={formatSeasonLabel(season)}
        title="收件箱"
        subtitle="教练、队友、经纪人和媒体都在这里等你回应。"
        right={openCount > 0 ? <span className="chip border-accent/30 text-accent">{openCount} 待处理</span> : undefined}
      />
      <InboxTabs tab={tab} onChange={onChange} />
    </div>
  )
}
