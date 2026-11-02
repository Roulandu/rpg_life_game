import {
  MOVE_LEVEL_MARKS,
  MOVE_PROGRESS_PER_LEVEL,
  investMoveCost,
  moveLevelGatePassed,
  moveLevelOf,
  round1,
} from '../../../domain'
import type { MoveDefinition, Player } from '../../../domain'

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
