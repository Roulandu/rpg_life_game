import type { HTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('card p-4', className)} {...props}>
      {children}
    </div>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3 px-1">
      <h2 className="section-title">{children}</h2>
      {right}
    </div>
  )
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="card-soft px-4 py-8 text-center">
      <p className="text-sm font-medium text-text">{title}</p>
      {body ? <p className="mt-1 text-xs leading-relaxed text-muted">{body}</p> : null}
    </div>
  )
}
