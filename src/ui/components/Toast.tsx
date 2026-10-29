import { useEffect } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { useGameStore } from '../../store'

export function Toast() {
  const notice = useGameStore((state) => state.notice)
  const error = useGameStore((state) => state.error)
  const setNotice = useGameStore((state) => state.setNotice)
  const setError = useGameStore((state) => state.setError)

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 3200)
    return () => window.clearTimeout(timer)
  }, [notice, setNotice])

  if (!notice && !error) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div
        role="status"
        aria-live="polite"
        className={
          error
            ? 'pointer-events-auto flex w-full max-w-[440px] items-start gap-2 rounded-xl border border-danger/40 bg-[#2a1010] px-3 py-2.5 text-xs text-danger shadow-lg'
            : 'pointer-events-auto flex w-full max-w-[440px] items-start gap-2 rounded-xl border border-accent/30 bg-card px-3 py-2.5 text-xs text-text shadow-lg animate-fade-up'
        }
      >
        {error ? null : <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-accent" />}
        <span className="flex-1 leading-relaxed">{error ?? notice}</span>
        <button
          type="button"
          aria-label="关闭提示"
          className="shrink-0 text-muted hover:text-text"
          onClick={() => {
            if (error) setError(null)
            else setNotice(null)
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
