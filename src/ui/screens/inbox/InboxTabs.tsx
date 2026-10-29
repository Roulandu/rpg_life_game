import clsx from 'clsx'
import type { InboxTab } from './inboxTab'

const TABS = [
  ['events', '事件'],
  ['chat', '对话'],
  ['news', '新闻'],
] as const

interface Props {
  tab: InboxTab
  onChange: (tab: InboxTab) => void
}

export function InboxTabs({ tab, onChange }: Props) {
  return (
    <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl border border-line bg-card-2 p-1">
      {TABS.map(([key, label]) => (
        <button
          key={key}
          type="button"
          className={clsx(
            'min-h-9 rounded-lg text-xs font-medium transition',
            tab === key ? 'bg-accent text-accent-ink' : 'text-muted hover:text-text',
          )}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
