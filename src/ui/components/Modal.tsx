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

/**
 * 打开中的可关闭弹窗，后进先出。
 * 手机返回键只有这一个入口能问它：不排队就直接退出应用，正在看的弹窗连一次关闭机会都没有。
 */
const openStack: Array<() => void> = []

function pushModal(close: () => void): () => void {
  openStack.push(close)
  return () => {
    const index = openStack.indexOf(close)
    if (index >= 0) openStack.splice(index, 1)
  }
}

/** 关掉最上面一层弹窗；栈空时返回 false，调用方才知道这次返回没被弹窗吃掉。 */
export function closeTopModal(): boolean {
  const close = openStack.pop()
  if (!close) return false
  close()
  return true
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
    const release = dismissible ? pushModal(onClose) : null
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
      release?.()
    }
  }, [open, dismissible, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-overlay px-3 pb-3 backdrop-blur-sm sm:items-center"
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
              className="btn-ghost -mr-2 -mt-2 min-h-11 min-w-11 px-3"
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
