import { STAFF_ROLE_ORDER, STAFF_ROLE_SPECS, staffWeeklyTotal } from '../../../domain'
import type { StaffCandidate, StaffFactors, StaffMember, StaffRole } from '../../../domain'
import { formatMoney } from '../../../lib'
import { Card, EmptyState, SectionTitle } from '../../components/Card'
import { CandidateRow, RosterRow } from './StaffRows'

/**
 * 系数是引擎算出来的，这里只负责说成人话：一条一行，玩家能对着数字判断「这个人值不值」。
 * 顺序固定按 队医 → 心理 → 私教，与名册读数的来源一致。
 */
function factorLines(factors: StaffFactors): string[] {
  const lines: string[] = []
  if (factors.injuryRisk < 1) {
    lines.push(`受伤概率 ×${factors.injuryRisk.toFixed(2)}，伤停天数 ×${factors.recoveryDays.toFixed(2)}`)
  }
  if (factors.dailyFitness > 0) {
    lines.push(`伤停期间每天补 ${factors.dailyFitness} 点体能`)
  }
  if (factors.moraleFloor > 0) {
    lines.push(`士气不低于 ${factors.moraleFloor}，自信每天 +${factors.confidencePerDay.toFixed(1)}`)
  }
  if (factors.psychBonus > 0) {
    lines.push(`高风险选择的成功率 +${(factors.psychBonus * 100).toFixed(1)}%`)
  }
  if (factors.expFactor > 1) {
    lines.push(`训练与特训给的经验 ×${factors.expFactor.toFixed(2)}`)
  }
  if (factors.investDiscount > 0) {
    lines.push(`属性投资的经验省 ${Math.round(factors.investDiscount * 100)}%`)
  }
  if (factors.specializationFactor > 1) {
    lines.push(`特训进度 ×${factors.specializationFactor.toFixed(2)}`)
  }
  return lines
}

export function RosterSection({
  roster,
  factors,
  onRelease,
}: {
  roster: StaffMember[]
  factors: StaffFactors
  onRelease: (staffId: string) => void
}) {
  const lines = factorLines(factors)

  return (
    <section aria-label="在职团队" className="mb-3 min-w-0">
      <SectionTitle right={<span className="chip font-mono">每周 {formatMoney(staffWeeklyTotal(roster))}</span>}>
        我的人
      </SectionTitle>
      <Card className="p-0">
        {roster.length === 0 ? (
          <EmptyState
            title="团队是空的"
            body="队医管伤病与康复，心理咨询师管士气与关键回合的心态，私人教练管训练效率。周薪按天累计、周日入账，随时可以解雇。"
          />
        ) : (
          <ul>
            {roster.map((member) => (
              <RosterRow key={member.id} member={member} onRelease={onRelease} />
            ))}
          </ul>
        )}
      </Card>
      <Card className="mt-2">
        {lines.length === 0 ? (
          <p className="text-[12px] leading-relaxed text-muted">
            一个人都没有，这些数字全都保持原样：该受伤还是受伤，该练多少经验还是多少。
          </p>
        ) : (
          <ul className="space-y-1">
            {lines.map((line) => (
              <li key={line} className="text-[12px] leading-relaxed text-muted">
                {line}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  )
}

function RoleBlock({
  role,
  candidates,
  taken,
  balance,
  onHire,
}: {
  role: StaffRole
  candidates: StaffCandidate[]
  taken: boolean
  balance: number
  onHire: (candidateId: string) => void
}) {
  const spec = STAFF_ROLE_SPECS[role]

  return (
    <div>
      <div className="px-4 pb-1 pt-3">
        <p className="text-[12px] font-semibold text-text">{spec.label}</p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-dim">{spec.dutyZh}</p>
      </div>
      {candidates.map((candidate) => (
        <CandidateRow
          key={candidate.id}
          candidate={candidate}
          taken={taken}
          affordable={balance >= candidate.weeklyCost}
          onHire={onHire}
        />
      ))}
    </div>
  )
}

export function CandidateSection({
  pool,
  roster,
  balance,
  onHire,
}: {
  pool: StaffCandidate[]
  roster: StaffMember[]
  balance: number
  onHire: (candidateId: string) => void
}) {
  const takenRoles = new Set(roster.map((member) => member.role))

  return (
    <section aria-label="可聘成员" className="mb-3 min-w-0">
      <SectionTitle>本季可聘</SectionTitle>
      <Card className="overflow-hidden pb-1">
        {STAFF_ROLE_ORDER.map((role) => (
          <RoleBlock
            key={role}
            role={role}
            candidates={pool.filter((item) => item.role === role)}
            taken={takenRoles.has(role)}
            balance={balance}
            onHire={onHire}
          />
        ))}
      </Card>
    </section>
  )
}
