import { moveById, moveFitsPosition, overall } from '../domain'
import type { Effect, MoveDefinition, Player, WorldState } from '../domain'
import { announceMoveLevel, trainMove } from './moveProgress'

/**
 * 职责：绝技获取的第四条路径——名宿通过事件直接授予等级，或给已有记录攒修炼进度。
 * 边界：只教声明了 mentor 路径且位置对得上的绝技；授予等级不越过综合分门槛，也绝不把已练到的级数降下去。
 * 依赖：src/domain 的绝技索引、./moveProgress 的进度落地与统一播报。
 */

/** 点拨没换来等级时的安慰进度：让每一次出场都不白跑。 */
export const MENTOR_PROGRESS = 1

function mentorGateOk(move: MoveDefinition, user: Player): boolean {
  return move.unlock.via.includes('mentor') && moveFitsPosition(move, user.position)
}

/** 名宿这次最多能把人教到第几级：想跳几级，就得先够到第几级的综合分门槛。 */
function grantedLevel(move: MoveDefinition, user: Player, wanted: number): number {
  const top = Math.min(Math.max(1, Math.trunc(wanted)), move.levels.length)
  let level = top
  while (level > 0 && overall(user) < (move.levels[level - 1]?.minOverall ?? 0)) {
    level -= 1
  }
  return level
}

/** 授予一级：够不到 Ⅰ 级门槛时退化成攒进度，等身体追上那天再自动入门。 */
export function teachMoveByMentor(
  world: WorldState,
  user: Player,
  moveId: string,
  wantedLevel: number,
): boolean {
  const move = moveById(moveId)
  if (!move || !mentorGateOk(move, user)) return false
  const moves = (user.moves ??= [])
  const record = moves.find((item) => item.moveId === move.id)
  const current = record?.level ?? 0
  const target = grantedLevel(move, user, wantedLevel)
  if (target <= current) return trainMove(world, user, move, MENTOR_PROGRESS, 'mentor')

  if (record) {
    record.level = target
    record.progress = 0
  } else {
    moves.push({ moveId: move.id, level: target, progress: 0 })
  }
  announceMoveLevel(world, user, move, target, 'mentor')
  return true
}

/** 只点拨不授技：给这条绝技补几格修炼进度。 */
export function advanceMoveByMentor(
  world: WorldState,
  user: Player,
  moveId: string,
  gain: number,
): boolean {
  const move = moveById(moveId)
  if (!move || !mentorGateOk(move, user)) return false
  return trainMove(world, user, move, Math.max(1, Math.trunc(gain)), 'mentor')
}

/** 事件里的两个绝技算子共用的入口：效果落地只认 op，其余交给上面的闸门。 */
export function applyMoveEffect(world: WorldState, user: Player, effect: Effect): void {
  if (effect.op === 'learnMove') {
    teachMoveByMentor(world, user, effect.moveId ?? '', effect.delta)
    return
  }
  if (effect.op === 'moveProgress') {
    advanceMoveByMentor(world, user, effect.moveId ?? '', effect.delta)
  }
}
