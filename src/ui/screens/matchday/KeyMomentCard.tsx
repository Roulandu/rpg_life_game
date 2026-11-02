import { FastForward, Sparkles } from 'lucide-react'
import type { KeyMoment, KeyMomentOption } from '../../../domain'
import { effectsSummary, successBasisText } from '../../../domain'
import { Card } from '../../components/Card'
import { basisTermsOf } from '../../labels'

/** 一行一个选项：绝技加成与对位压制各自成块，其余依据与影响留在下面两行。 */
function OptionButton({
  option,
  acting,
  onChoose,
}: {
  option: KeyMomentOption
  acting: boolean
  onChoose: (optionId: string) => void
}) {
  const terms = basisTermsOf(option.successBasisZh)
  const moves = terms.filter((term) => term.kind === 'move')
  const counters = terms.filter((term) => term.kind === 'counter')
  const plain = terms.filter((term) => term.kind === 'term')

  return (
    <button
      type="button"
      disabled={acting}
      className="w-full rounded-xl border border-line bg-card-2 px-3 py-2.5 text-left transition hover:border-teal/60 disabled:opacity-60"
      onClick={() => onChoose(option.id)}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-text">{option.labelZh}</span>
        <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {moves.map((term) => (
            <span key={term.text} className="chip text-teal">
              <Sparkles size={10} />
              <span>绝技</span>
              <span>{term.text}</span>
            </span>
          ))}
          <span className="chip font-mono">
            {successBasisText({ ...option, successBasisZh: undefined })}
          </span>
        </span>
      </span>
      <span className="mt-0.5 block text-[10px] leading-relaxed text-muted">{option.descriptionZh}</span>
      {counters.length > 0 ? (
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="chip text-gold">压制</span>
          {counters.map((term) => (
            <span key={term.text} className="font-mono text-[10px] text-dim">
              {term.text}
            </span>
          ))}
        </span>
      ) : null}
      {plain.length > 0 ? (
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          {plain.map((term) => (
            <span key={term.text} className="font-mono text-[10px] text-dim">
              {term.text}
            </span>
          ))}
        </span>
      ) : null}
      <span className="mt-0.5 block text-[10px] leading-relaxed text-dim">{effectsSummary(option)}</span>
    </button>
  )
}

export function KeyMomentCard({
  active,
  acting,
  onChoose,
  onSkip,
}: {
  active: KeyMoment
  acting: boolean
  onChoose: (momentId: string, optionId: string) => void
  onSkip: () => void
}) {
  return (
    <Card className="border-teal/30">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-text">{active.titleZh}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">{active.promptZh}</p>
          {active.triggerZh ? (
            <p className="mt-1 text-[10px] leading-relaxed text-dim">触发条件：{active.triggerZh}</p>
          ) : null}
        </div>
        <span className="chip shrink-0 font-mono">{active.minute}&apos;</span>
      </div>
      <div className="mt-3 space-y-1.5">
        {active.options.map((option) => (
          <OptionButton
            key={option.id}
            option={option}
            acting={acting}
            onChoose={(optionId) => onChoose(active.id, optionId)}
          />
        ))}
      </div>
      <button type="button" className="btn-ghost mt-2 w-full justify-center text-[11px]" disabled={acting} onClick={onSkip}>
        <FastForward size={13} /> 跳过剩余回合（按稳妥选择处理）
      </button>
    </Card>
  )
}
