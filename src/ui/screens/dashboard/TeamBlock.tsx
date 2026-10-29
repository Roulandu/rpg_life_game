import clsx from 'clsx'

export function TeamBlock({
  name,
  colors,
  align,
}: {
  name: string
  colors: { primary: string; secondary: string }
  align: 'left' | 'right'
}) {
  return (
    <div className={clsx('flex min-w-0 items-center gap-2', align === 'right' && 'flex-row-reverse')}>
      <div
        className="grid size-9 shrink-0 place-items-center rounded-lg border text-xs font-black"
        style={{ backgroundColor: colors.secondary, borderColor: colors.primary, color: colors.primary }}
        aria-hidden="true"
      >
        {name.slice(0, 1)}
      </div>
      <span className={clsx('min-w-0 truncate text-xs font-medium text-text', align === 'right' && 'text-right')}>
        {name}
      </span>
    </div>
  )
}
