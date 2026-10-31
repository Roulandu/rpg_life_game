import type { KeyMoment, MatchReport } from '../../../domain'
import { effectsSummary } from '../../../domain'
import type { LivePlayback } from '../../../store'
import { Modal } from '../../components/Modal'
import { KeyMomentCard } from './KeyMomentCard'

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function ResultBody({
  moment,
  onContinue,
}: {
  moment: KeyMoment
  onContinue: () => void
}) {
  const outcome = moment.outcome!
  const option = moment.options.find((item) => item.id === outcome.optionId) ?? moment.options[0]!
  return (
    <div>
      <p className="text-[11px] leading-relaxed text-text">{outcome.textZh}</p>
      <p className="mt-3 rounded-xl border border-line bg-card-2 px-3 py-2 text-[10px] leading-relaxed text-muted">
        掷骰 {percent(moment.roll)} · 阈值 {percent(option.successChance)} ·{' '}
        {outcome.success ? '成功' : '失败'}
      </p>
      <p className="mt-2 text-[10px] text-muted">成功率 {percent(option.successChance)}</p>
      <p className="mt-1 text-[10px] leading-relaxed text-dim">{effectsSummary(option)}</p>
      <button type="button" className="btn-primary mt-4 w-full justify-center" onClick={onContinue}>
        继续比赛
      </button>
    </div>
  )
}

export function KeyMomentModal({
  match,
  playback,
  acting,
  onChoose,
  onSkip,
  onContinue,
}: {
  match: MatchReport
  playback: LivePlayback
  acting: boolean
  onChoose: (momentId: string, optionId: string) => void
  onSkip: () => void
  onContinue: () => void
}) {
  const moments = match.keyMoments ?? []
  if (playback.phase === 'awaiting') {
    const moment = moments.find((item) => !item.outcome)
    if (!moment) return null
    return (
      <Modal
        open
        dismissible={false}
        title={`第 ${moment.minute} 分钟 · 关键时刻`}
        onClose={() => undefined}
      >
        <KeyMomentCard active={moment} acting={acting} onChoose={onChoose} onSkip={onSkip} />
      </Modal>
    )
  }
  if (playback.phase === 'result') {
    const moment = moments.find((item) => item.id === playback.resultMomentId)
    if (!moment?.outcome) return null
    return (
      <Modal
        open
        dismissible={false}
        title="回合结果"
        description={`第 ${moment.minute} 分钟 · ${moment.titleZh}`}
        onClose={() => undefined}
      >
        <ResultBody moment={moment} onContinue={onContinue} />
      </Modal>
    )
  }
  return null
}
