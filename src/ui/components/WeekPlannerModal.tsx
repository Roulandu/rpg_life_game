import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { TRAINING_DESCRIPTIONS, TRAINING_LABELS } from '../../domain'
import type { ExtraAction, TrainingFocus, WorldState } from '../../domain'
import { useGameStore } from '../../store'
import clsx from 'clsx'
import { Modal } from './Modal'
import { EXTRA_ACTION_LABELS } from '../labels'

const TRAINING_OPTIONS: TrainingFocus[] = ['physical', 'technical', 'tactical', 'recovery']
const EXTRA_OPTIONS: ExtraAction[] = ['none', 'rest', 'media', 'agent', 'social', 'family']

interface WeekPlannerModalProps {
  open: boolean
  world: WorldState
  onClose: () => void
}

export function WeekPlannerModal({ open, world, onClose }: WeekPlannerModalProps) {
  const navigate = useNavigate()
  const advance = useGameStore((state) => state.advance)
  const busy = useGameStore((state) => state.busy)
  const [training, setTraining] = useState<TrainingFocus>('technical')
  const [extra, setExtra] = useState<ExtraAction>('none')

  const user = world.players[world.playerId]
  const injured = Boolean(user?.injury)

  async function handleAdvance() {
    const result = await advance({ training, extra })
    if (!result) return
    onClose()
    if (result.match) navigate('/match')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!busy}
      title={`安排第 ${world.week} 周`}
      description="训练决定成长，额外安排影响关系、状态与收入。推进后会进入比赛日，你可以亲自处理关键回合或快速跳过。"
      footer={
        <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => void handleAdvance()}>
          {busy ? <LoaderCircle size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          {busy ? '正在模拟…' : `推进到第 ${world.week} 周比赛`}
        </button>
      }
    >
      <div className="space-y-4">
        <section>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">训练重点</p>
          <div className="grid grid-cols-2 gap-1.5">
            {TRAINING_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTraining(option)}
                className={clsx(
                  'rounded-xl border px-3 py-2.5 text-left transition',
                  training === option
                    ? 'border-accent bg-accent/10'
                    : 'border-line bg-card-2 hover:border-line',
                )}
              >
                <span className={clsx('block text-xs font-semibold', training === option ? 'text-accent' : 'text-text')}>
                  {TRAINING_LABELS[option]}
                </span>
                <span className="mt-0.5 block text-[10px] leading-relaxed text-muted">
                  {TRAINING_DESCRIPTIONS[option]}
                </span>
              </button>
            ))}
          </div>
          {injured ? (
            <p className="mt-2 text-[11px] leading-relaxed text-gold">
              你正在伤停中，本周会以恢复为主，训练成长收益较低。
            </p>
          ) : null}
        </section>

        <section>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">额外安排</p>
          <div className="grid grid-cols-2 gap-1.5">
            {EXTRA_OPTIONS.map((option) => {
              const item = EXTRA_ACTION_LABELS[option]
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setExtra(option)}
                  className={clsx(
                    'rounded-xl border px-3 py-2.5 text-left transition',
                    extra === option
                      ? 'border-teal bg-teal/10'
                      : 'border-line bg-card-2 hover:border-line',
                  )}
                >
                  <span className={clsx('block text-xs font-semibold', extra === option ? 'text-teal' : 'text-text')}>
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-relaxed text-muted">{item.description}</span>
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </Modal>
  )
}
