import { STAFF_ROLE_SPECS } from '../../../domain'
import type { StaffCandidate, StaffMember } from '../../../domain'
import { formatMoney } from '../../../lib'

/** 候选人一行：中文名主导，价格与动作靠右；不可雇时不留死按钮，直接把原因写成一句话。 */
export function CandidateRow({
  candidate,
  taken,
  affordable,
  onHire,
}: {
  candidate: StaffCandidate
  taken: boolean
  affordable: boolean
  onHire: (candidateId: string) => void
}) {
  const label = STAFF_ROLE_SPECS[candidate.role].label

  return (
    <div className="flex items-center justify-between gap-3 border-t border-line-soft px-4 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-[13px] text-text">{candidate.nameZh}</p>
        <p className="mt-0.5 truncate text-[10px] text-dim">
          {label} · 水平 {candidate.quality} · 周薪 {formatMoney(candidate.weeklyCost)}
        </p>
      </div>
      {taken ? (
        <span className="chip shrink-0">已有{label}</span>
      ) : !affordable ? (
        <span className="chip shrink-0">余额不够</span>
      ) : (
        <button
          type="button"
          className="btn-secondary shrink-0 px-3 text-[12px]"
          onClick={() => onHire(candidate.id)}
        >
          雇 {candidate.nameZh}
        </button>
      )}
    </div>
  )
}

/** 在职成员把拉丁原名留在第二行：主界面读中文名，存档与合同仍用原名。 */
export function RosterRow({
  member,
  onRelease,
}: {
  member: StaffMember
  onRelease: (staffId: string) => void
}) {
  return (
    <li className="flex items-center justify-between gap-3 border-t border-line-soft px-4 py-2.5 first:border-t-0">
      <div className="min-w-0">
        <p className="truncate text-[13px] text-text">{member.nameZh}</p>
        <p className="truncate font-mono text-[10px] text-dim">原名 {member.name}</p>
        <p className="mt-0.5 truncate text-[10px] text-muted">
          {STAFF_ROLE_SPECS[member.role].label} · 水平 {member.quality}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="chip font-mono">{formatMoney(member.weeklyCost)}</span>
        <button
          type="button"
          className="btn-ghost px-3 text-[12px] text-danger"
          onClick={() => onRelease(member.id)}
        >
          解雇 {member.nameZh}
        </button>
      </div>
    </li>
  )
}
