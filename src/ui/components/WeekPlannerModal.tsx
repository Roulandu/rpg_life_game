import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { TRAINING_DESCRIPTIONS, TRAINING_LABELS } from '../../domain'
import type { ExtraAction, Player, TrainingFocus, WorldState } from '../../domain'
import { useGameStore } from '../../store'
import clsx from 'clsx'
import { Modal } from './Modal'
import { MoveSlotPicker } from '../screens/moves/MoveSlotPicker'
import { EXTRA_ACTION_LABELS } from '../labels'

const TRAINING_OPTIONS: TrainingFocus[] = ['physical', 'technical', 'tactical', 'recovery']
const EXTRA_OPTIONS: ExtraAction[] = ['none', 'rest', 'media', 'agent', 'social', 'family']

const TONE_STYLES = {
  accent: { box: 'border-accent bg-accent/10', text: 'text-accent' },
  teal: { box: 'border-teal bg-teal/10', text: 'text-teal' },
} as const

interface PlannerOption<T extends string> {
  value: T
  label: string
  description: string
}

interface OptionGridProps<T extends string> {
  title: string
  options: PlannerOption<T>[]
  active: T
  tone: 'accent' | 'teal'
  onSelect: (value: T) => void
}

function OptionGrid<T extends string>({ title, options, active, tone, onSelect }: OptionGridProps<T>) {
  const style = TONE_STYLES[tone]
  return (
    <section>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{title}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={clsx(
              'rounded-xl border px-3 py-2.5 text-left transition',
              active === option.value ? style.box : 'border-line bg-card-2 hover:border-line',
            )}
          >
            <span className={clsx('block text-xs font-semibold', active === option.value ? style.text : 'text-text')}>
              {option.label}
            </span>
            <span className="mt-0.5 block text-[10px] leading-relaxed text-muted">{option.description}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function PlannerFooter({ busy, onSave }: { busy: boolean; onSave: (advance: boolean) => void }) {
  return (
    <div className="space-y-2">
      <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => onSave(true)}>
        {busy ? <LoaderCircle size={16} className="animate-spin" /> : <ArrowRight size={16} />}
        {busy ? '正在推进…' : '保存并推进到下一件事'}
      </button>
      <button type="button" className="btn-secondary w-full" disabled={busy} onClick={() => onSave(false)}>
        只保存本周安排
      </button>
    </div>
  )
}

interface WeekPlannerModalProps {
  open: boolean
  world: WorldState
  onClose: () => void
}

interface PlannerBodyProps {
  user?: Player
  training: TrainingFocus
  extra: ExtraAction
  slot: string | null
  onTraining: (value: TrainingFocus) => void
  onExtra: (value: ExtraAction) => void
  onSlot: (value: string | null) => void
}

/** 弹窗主体：三组选择各自成段，伤病提示跟在训练重点后面。 */
function PlannerBody({ user, training, extra, slot, onTraining, onExtra, onSlot }: PlannerBodyProps) {
  return (
    <div className="space-y-4">
      <OptionGrid
        title="训练重点"
        tone="accent"
        active={training}
        onSelect={onTraining}
        options={TRAINING_OPTIONS.map((value) => ({
          value,
          label: TRAINING_LABELS[value],
          description: TRAINING_DESCRIPTIONS[value],
        }))}
      />
      {user?.injury ? (
        <p className="-mt-2 text-[11px] leading-relaxed text-gold">
          你正在伤停中，本周会以恢复为主，训练成长收益较低。
        </p>
      ) : null}
      <OptionGrid
        title="额外安排"
        tone="teal"
        active={extra}
        onSelect={onExtra}
        options={EXTRA_OPTIONS.map((value) => ({
          value,
          label: EXTRA_ACTION_LABELS[value].label,
          description: EXTRA_ACTION_LABELS[value].description,
        }))}
      />
      {user ? <MoveSlotPicker user={user} active={slot} onSelect={onSlot} /> : null}
    </div>
  )
}

export function WeekPlannerModal({ open, world, onClose }: WeekPlannerModalProps) {
  const navigate = useNavigate()
  const setWeekPlan = useGameStore((state) => state.setWeekPlan)
  const advanceToNextEvent = useGameStore((state) => state.advanceToNextEvent)
  const busy = useGameStore((state) => state.busy)
  const [training, setTraining] = useState<TrainingFocus>(world.weekPlan.training)
  const [extra, setExtra] = useState<ExtraAction>(world.weekPlan.extra)
  const [slot, setSlot] = useState<string | null>(world.weekPlan.specialization ?? null)

  const user = world.players[world.playerId]

  async function handleSave(advance: boolean) {
    if (!(await setWeekPlan({ training, extra, specialization: slot }))) return
    if (!advance) {
      onClose()
      return
    }
    const fast = await advanceToNextEvent()
    onClose()
    if (fast?.stopReason === 'matchday') navigate('/match')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!busy}
      title={`安排第 ${world.week} 周`}
      description="这一周每天都会按这个模板自动执行：训练带来成长，额外安排影响关系、状态与收入，周三特训攒绝技进度。推进后如果遇到比赛日会停下来等你处理关键回合。"
      footer={<PlannerFooter busy={busy} onSave={(advance) => void handleSave(advance)} />}
    >
      <PlannerBody
        user={user}
        training={training}
        extra={extra}
        slot={slot}
        onTraining={setTraining}
        onExtra={setExtra}
        onSlot={setSlot}
      />
    </Modal>
  )
}
