import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  subtitle?: string
  right?: ReactNode
}

export function PageHeader({ eyebrow, title, subtitle, right }: PageHeaderProps) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-accent">{eyebrow}</p> : null}
        <h1 className="truncate text-[26px] font-semibold leading-tight tracking-tight text-text">{title}</h1>
        {subtitle ? <p className="mt-1 text-xs leading-relaxed text-muted">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </header>
  )
}
