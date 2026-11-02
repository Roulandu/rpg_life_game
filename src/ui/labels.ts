import { moveById } from '../domain'
import type {
  Effect,
  EffectOp,
  ExtraAction,
  KeyMomentKind,
  MoveFamily,
  MoveUnlockPath,
  Player,
} from '../domain'
import { formatMoneyShort } from '../lib'

export const SQUAD_ROLE_LABELS: Record<Player['squadRole'], string> = {
  youth: '青训',
  rotation: '轮换',
  starter: '主力',
  star: '核心',
}

export const MOVE_FAMILY_LABELS: Record<MoveFamily, string> = {
  shooting: '射门',
  dribbling: '盘带',
  passing: '传球',
  aerial: '空中',
  defending: '防守',
  goalkeeping: '门将',
  tempo: '节奏',
  setpiece: '定位球',
}

/** 详情页只说这一招落在哪一类回合上：选项 id 是引擎数据，不该让玩家读裸英文。 */
export const MOVE_KIND_LABELS: Record<KeyMomentKind, string> = {
  bigChance: '绝佳机会',
  penalty: '点球',
  throughBall: '直塞',
  duel: '一对一防守',
  save: '扑救',
  clearance: '解围',
  freeKick: '任意球',
  headerDuel: '争顶',
  oneOnOne: '单刀',
  counterAttack: '反击',
  cross: '传中',
  longShot: '远射',
}

export const MOVE_PATH_LABELS: Record<MoveUnlockPath, string> = {
  exp: '经验解锁',
  mentor: '名宿传授',
  specialization: '周三特训',
  matchDrop: '比赛掉落',
}

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
  injuryDays: '伤停天数',
  exp: '经验',
  legendTrust: '名宿信任',
  learnMove: '学绝技',
  moveProgress: '绝技进度',
}

/** 绝技类效果点名到具体那一招：玩家要看懂「学会什么」，而不是裸字段名。 */
function moveEffectText(effect: Effect): string {
  const name = moveById(effect.moveId ?? '')?.nameZh ?? '一门绝技'
  return effect.op === 'learnMove' ? `学会 ${name}` : `${name} 进度 +${effect.delta}`
}

export function effectText(effect: Effect): string {
  if (effect.op === 'money') {
    const amount = formatMoneyShort(effect.delta * 100)
    return `${EFFECT_LABELS.money} ${effect.delta >= 0 ? '+' : ''}${amount}`
  }
  if (effect.op === 'injuryDays') {
    const days = Math.abs(effect.delta)
    return effect.delta < 0 ? `伤停缩短 ${days} 天` : `伤停延长 ${days} 天`
  }
  if (effect.op === 'learnMove' || effect.op === 'moveProgress') return moveEffectText(effect)
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
