import {
  MOVE_LEVEL_MARKS,
  MOVE_PROGRESS_PER_LEVEL,
  allMoves,
  investMoveCost,
  moveFitsPosition,
  moveLevelGatePassed,
  moveLevelOf,
  round1,
} from '../../../domain'
import type { MoveDefinition, Player } from '../../../domain'
import { MOVE_FAMILY_LABELS } from '../../labels'

/** 成功率与风险都写成带符号的百分数，和战报里的口径一致。 */
export function chanceText(delta: number): string {
  const points = round1(delta * 100)
  return `${points >= 0 ? '+' : '-'}${Math.abs(points).toFixed(1)}%`
}

export interface MoveAction {
  text: string
  enabled: boolean
}

/** 按钮文案一律问 domain 的三个纯函数：界面不算第二套价格与门槛。 */
export function moveActionOf(move: MoveDefinition, user: Player): MoveAction {
  const level = moveLevelOf(user, move.id)
  const cost = investMoveCost(move, level)
  if (cost === null) return { text: '已练到尽头', enabled: false }
  const gate = move.levels[Math.min(level, move.levels.length - 1)]
  if (gate && !moveLevelGatePassed(move, user)) {
    return { text: `要综合分 ${gate.minOverall}`, enabled: false }
  }
  if (cost > user.exp) return { text: `要 ${cost} 经验`, enabled: false }
  const mark = MOVE_LEVEL_MARKS[level] ?? ''
  return {
    text: level === 0 ? `解锁 ${cost} 经验` : `升到 ${mark} ${cost} 经验`,
    enabled: true,
  }
}

/** 0 级的记录是「还在练」，不能读成已经学会。 */
export function moveStatusText(move: MoveDefinition, user: Player): string {
  const level = moveLevelOf(user, move.id)
  if (level >= 1) return `已练到 ${MOVE_LEVEL_MARKS[level - 1] ?? ''} 级`
  const progress = user.moves?.find((item) => item.moveId === move.id)?.progress ?? 0
  return `修炼进度 ${progress}/${MOVE_PROGRESS_PER_LEVEL}`
}

/**
 * 周三特训槽的候选：位置对得上，且数据包允许靠特训攒进度（名宿专属的那些进不了槽）。
 * 已经在练的排前面，同组里先列便宜的，让玩家先看见「接着练哪一招」。
 */
export function specializationCandidates(user: Player): MoveDefinition[] {
  return allMoves()
    .filter((move) => move.unlock.via.includes('specialization') && moveFitsPosition(move, user.position))
    .sort((a, b) => {
      const levelGap = moveLevelOf(user, b.id) - moveLevelOf(user, a.id)
      if (levelGap !== 0) return levelGap
      return (a.levels[0]?.costExp ?? 0) - (b.levels[0]?.costExp ?? 0)
    })
}

/** 槽位那一行只说两件事：这一招归哪个流派、现在练到哪。 */
export function moveSlotHint(move: MoveDefinition, user: Player): string {
  const family = MOVE_FAMILY_LABELS[move.family]
  const held = user.moves?.find((item) => item.moveId === move.id)
  const level = moveLevelOf(user, move.id)
  if (level < 1) {
    const progress = held?.progress ?? 0
    return progress > 0 ? `${family} · 攒到 ${progress}/${MOVE_PROGRESS_PER_LEVEL}` : `${family} · 还没练过`
  }
  return `${family} · ${MOVE_LEVEL_MARKS[level - 1] ?? ''} 级 · 进度 ${held?.progress ?? 0}/${MOVE_PROGRESS_PER_LEVEL}`
}

