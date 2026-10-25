import type { Effect, EffectOp, ExtraAction } from '../domain/types'
import { formatMoneyShort } from '../lib/format'

export const EFFECT_LABELS: Record<EffectOp, string> = {
  morale: '士气',
  fitness: '体能',
  sharpness: '锐度',
  confidence: '信心',
  coachTrust: '教练信任',
  teammateTrust: '队友关系',
  agentTrust: '经纪人信任',
  familyTrust: '家人关系',
  mediaRep: '媒体声望',
  fanRep: '球迷好感',
  money: '金钱',
}

export function effectText(effect: Effect): string {
  if (effect.op === 'money') {
    const amount = formatMoneyShort(effect.delta * 100)
    return `${EFFECT_LABELS.money} ${effect.delta >= 0 ? '+' : ''}${amount}`
  }
  return `${EFFECT_LABELS[effect.op]} ${effect.delta >= 0 ? '+' : ''}${effect.delta}`
}

export function effectList(effects: Effect[]): string {
  return effects.map(effectText).join(' · ')
}

export const EXTRA_ACTION_LABELS: Record<ExtraAction, { label: string; description: string }> = {
  none: { label: '不加安排', description: '把额外时间留给日常恢复。' },
  media: { label: '媒体活动', description: '提升曝光与球迷好感，但会消耗一点精力。' },
  agent: { label: '联系经纪人', description: '维护关系，可能带来商业机会。' },
  social: { label: '队友聚会', description: '提升更衣室关系与士气。' },
  rest: { label: '休息恢复', description: '恢复体能，但锐度会略微下降。' },
  family: { label: '陪伴家人', description: '稳定情绪，获得家人的支持。' },
}

export function stateTone(value: number): 'accent' | 'teal' | 'gold' | 'danger' {
  if (value >= 70) return 'accent'
  if (value >= 50) return 'teal'
  if (value >= 30) return 'gold'
  return 'danger'
}

export function formTone(value: number): string {
  if (value >= 67) return 'text-accent'
  if (value >= 45) return 'text-teal'
  return 'text-gold'
}

export function ratingTone(value: number | null): string {
  if (value == null) return 'text-muted'
  if (value >= 7.5) return 'text-accent'
  if (value >= 6.8) return 'text-teal'
  if (value >= 6) return 'text-gold'
  return 'text-danger'
}
