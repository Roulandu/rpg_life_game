import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

export function MenuRow({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: ReactNode
  label: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-card-2/60"
      onClick={onClick}
    >
      <span className="text-muted">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-text">{label}</span>
        <span className="mt-0.5 block text-[10px] text-dim">{hint}</span>
      </span>
      <ChevronRight size={15} className="shrink-0 text-dim" />
    </button>
  )
}
