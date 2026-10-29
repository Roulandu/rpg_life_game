import { CheckCircle2, XCircle } from 'lucide-react'
import type { KeyMoment } from '../../../domain/types'
import clsx from 'clsx'

export function MomentList({ moments }: { moments: KeyMoment[] }) {
  return (
    <div className="space-y-1.5">
      {moments.map((moment) => (
        <MomentRow key={moment.id} moment={moment} />
      ))}
    </div>
  )
}

function MomentRow({ moment }: { moment: KeyMoment }) {
  return (
    <div
      className={clsx(
        'flex items-start gap-2.5 rounded-xl border px-3 py-2',
        moment.outcome?.success ? 'border-teal/30 bg-teal/5' : 'border-danger/25 bg-danger/5',
      )}
    >
      {moment.outcome?.success ? (
        <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-teal" />
      ) : (
        <XCircle size={14} className="mt-0.5 shrink-0 text-danger" />
      )}
      <div className="min-w-0">
        <p className="text-[10px] text-dim">
          {moment.minute}&apos; · {moment.titleZh}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-text">{moment.outcome?.textZh}</p>
      </div>
    </div>
  )
}
