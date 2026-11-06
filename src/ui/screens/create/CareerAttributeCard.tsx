import { ALLOCATION_MAX_PER_ATTR, ATTR_KEYS, ATTR_LABELS, canInvestAttribute } from '../../../domain'
import type { AllocationIssue, AttrKey } from '../../../domain'
import { Card, SectionTitle } from '../../components/Card'
import type { CareerDraft } from './useCareerDraft'

function issueText(issue: AllocationIssue, over: number, potential: number): string {
  switch (issue) {
    case 'overBudget':
      return `超出可分配点数 ${over} 点`
    case 'overPerAttr':
      return `单项最多加 ${ALLOCATION_MAX_PER_ATTR} 点`
    case 'overPotential':
      return `加点后会越过潜力 ${potential.toFixed(1)}`
    case 'goalkeepingGate':
      return '非门将不给门将属性加点'
    case 'invalidPoints':
      return '点数必须是正整数'
  }
}

function CareerAttrRow({ draft, attrKey }: { draft: CareerDraft; attrKey: AttrKey }) {
  const label = ATTR_LABELS[attrKey]
  const base = draft.preview.baseAttributes[attrKey]
  const value = draft.preview.attributes[attrKey]
  const delta = draft.allocation[attrKey] ?? 0
  // 整套加点作废时世界层会回落到基准，此时画「64.8 → 64.8」只会让人以为加号坏了。
  const effective = delta > 0 && draft.preview.ok
  return (
    <li className="flex min-h-11 items-center gap-2 rounded-xl border border-line bg-card-2 px-3">
      <span className="flex-1 text-sm">{label}</span>
      <span className="font-mono text-xs text-muted">
        {effective ? `${base.toFixed(1)} → ${value.toFixed(1)}` : base.toFixed(1)}
      </span>
      {delta > 0 && <span className={effective ? 'chip text-accent' : 'chip'}>+{delta}</span>}
      <button
        type="button"
        aria-label={`给${label}减 1 点`}
        className="btn-ghost min-w-11 shrink-0 rounded-xl border border-line px-0 text-base"
        disabled={delta === 0}
        onClick={() => draft.bump(attrKey, -1)}
      >
        −
      </button>
      <button
        type="button"
        aria-label={`给${label}加 1 点`}
        className="btn-ghost min-w-11 shrink-0 rounded-xl border border-line px-0 text-base"
        onClick={() => draft.bump(attrKey, 1)}
      >
        +
      </button>
    </li>
  )
}

/**
 * 属性点买：把 `checkAllocation` 的预算、封顶与潜力约束摊到界面上。
 * 数字全部来自 `draft.preview`，也就是世界生成时真正使用的同一份基准。
 */
export function CareerAttributeCard({ draft }: { draft: CareerDraft }) {
  const preview = draft.preview
  const left = Math.max(0, preview.budget - preview.used)
  const keys = ATTR_KEYS.filter((key) => canInvestAttribute(key, draft.position))
  return (
    <Card>
      <SectionTitle right={<span className="chip text-accent">{left} 点可用</span>}>属性点买</SectionTitle>
      <p className="mb-2 text-[11px] leading-relaxed text-dim">
        综合 {preview.overall.toFixed(1)} · 潜力 {preview.potential.toFixed(1)}。基准只由种子、年龄与位置决定：点买不消耗随机数，换种子会重抽，改名不会。
      </p>
      <ul className="space-y-1.5">
        {keys.map((key) => (
          <CareerAttrRow key={key} draft={draft} attrKey={key} />
        ))}
      </ul>
      {!preview.ok && (
        <p role="alert" className="mt-2 text-[11px] leading-relaxed text-danger">
          <span>
            {preview.issues
              .map((issue) => issueText(issue, preview.used - preview.budget, preview.potential))
              .join('；')}
          </span>
          <span className="block">当前加点不会生效，签下去的是未加点的基准属性。</span>
        </p>
      )}
    </Card>
  )
}
