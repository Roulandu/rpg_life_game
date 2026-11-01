import type { Club } from '../../../domain'

export function CoachCard({ club }: { club: Club }) {
  const coach = club.coach

  return (
    <section className="card mb-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="section-title">教练组</h2>
          <p className="mt-1 truncate text-sm font-semibold text-text">{coach.name}</p>
        </div>
        <span className="chip shrink-0">{coach.age} 岁</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="card-soft px-3 py-2">
          <p className="text-[10px] text-dim">执教评分</p>
          <p className="mt-0.5 font-mono text-sm text-text">{coach.quality}</p>
        </div>
        <div className="card-soft px-3 py-2">
          <p className="text-[10px] text-dim">一线队人数</p>
          <p className="mt-0.5 font-mono text-sm text-text">{club.squadIds.length}</p>
        </div>
      </div>
    </section>
  )
}
