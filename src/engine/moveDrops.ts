import { moveFitsPosition, movesTargeting } from '../domain'
import type { MatchReport, WorldState } from '../domain'
import { createRng } from '../lib'
import { trainMove } from './moveProgress'

/**
 * 职责：第四条绝技获取路径——比赛表现掉落。结算一场比赛时，把踢成功的关键回合折算成对应绝技的修炼进度。
 * 边界：评分必须过 MOVE_DROP_MIN_RATING，出场过才算；只发给 unlock.via 含 matchDrop 且位置对得上的绝技。
 * 依赖：src/domain 的绝技索引（movesTargeting / moveFitsPosition）、src/lib 的 createRng、./moveProgress 的进度落地。
 */
export const MOVE_DROP_MIN_RATING = 7.8
export const MOVE_DROP_PROGRESS = 1

function candidatesOf(world: WorldState, kind: string, optionId: string) {
  const user = world.players[world.playerId]
  if (!user) return []
  return movesTargeting(kind, optionId).filter(
    (move) => move.unlock.via.includes('matchDrop') && moveFitsPosition(move, user.position),
  )
}

/**
 * 每个成功回合单独抽一条命中的绝技：抽签域是 (fixtureId, momentId)，
 * 所以同一场比赛重放必然给出同样的掉落，快进与手玩结果一致。
 */
export function grantMoveDrops(world: WorldState, report: MatchReport): void {
  const user = world.players[world.playerId]
  if (!user || !report.userPlayed) return
  if (report.userRating == null || report.userRating < MOVE_DROP_MIN_RATING) return

  for (const moment of report.keyMoments ?? []) {
    const optionId = moment.outcome?.optionId
    if (!moment.outcome?.success || !optionId) continue
    const candidates = candidatesOf(world, moment.kind, optionId)
    if (candidates.length === 0) continue
    const move = createRng(world.seed, 'moveDrop', report.fixtureId, moment.id).pick(candidates)
    trainMove(world, user, move, MOVE_DROP_PROGRESS, 'matchDrop')
  }
}
