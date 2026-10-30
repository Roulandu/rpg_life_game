import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  dismissible?: boolean
}

export function Modal({ open, title, description, onClose, children, footer, dismissible = true }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissible) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [open, dismissible, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-3 pb-3 backdrop-blur-sm sm:items-center"
      onMouseDown={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="card max-h-[88svh] w-full max-w-[460px] overflow-y-auto p-5 animate-fade-up sm:max-w-[560px]"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text">{title}</h2>
            {description ? <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p> : null}
          </div>
          {dismissible ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭"
              className="btn-ghost -mr-2 -mt-2 min-h-11 px-3"
            >
              <X size={18} />
            </button>
          ) : null}
        </div>
        {children}
        {footer ? <div className="mt-5">{footer}</div> : null}
      </div>
    </div>
  )
}
