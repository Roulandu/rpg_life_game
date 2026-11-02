import {
  MOVE_LEVEL_MARKS,
  MOVE_MAX_LEVEL,
  displayName,
  moveById,
  moveFitsPosition,
  nextMoveLevel,
} from '../domain'
import type { MoveDefinition, PlayerMove, WorldState } from '../domain'
import { dailyId } from './dayContext'
import { grantExp } from './growth'

/**
 * 职责：每周一次的「特训槽」日结算——把周计划里指定的那条绝技练出进度，攒满一格就升级。
 * 边界：只有位置对得上、且 unlock.via 允许特训的绝技才涨进度；受伤当天不练；满级后不再攒进度。
 * 依赖：src/domain 的绝技查询（moveById / moveFitsPosition / nextMoveLevel）与 ./growth 的经验入口。
 */
export const SPECIALIZATION_PROGRESS = 1
export const SPECIALIZATION_EXP = 1

function announceLevelUp(world: WorldState, move: MoveDefinition, level: number): void {
  const user = world.players[world.playerId]
  const mark = MOVE_LEVEL_MARKS[level - 1] ?? ''
  world.news.unshift({
    id: dailyId(world, 'news:spec', move.id),
    season: world.season,
    week: world.week,
    day: world.day,
    title: level === 1 ? `学会${move.nameZh}` : `${move.nameZh} 练到 ${mark} 级`,
    body: `${user ? displayName(user) : '他'} 在这一周的特训里把 ${move.nameZh} 练成了 ${mark} 级，下次遇到对位球员时这一档会真的写进成功率。`,
    kind: 'club',
  })
}

/** 攒满一格进度、综合分也过门槛时才落地等级；其余情况只把进度留在账上。 */
function promote(world: WorldState, user: WorldState['players'][string], move: MoveDefinition, record: PlayerMove): void {
  const next = nextMoveLevel(user, move)
  if (!next) return
  record.level = next.level
  record.progress = next.progress
  announceLevelUp(world, move, next.level)
}

export function applySpecialization(world: WorldState): void {
  const user = world.players[world.playerId]
  const moveId = world.weekPlan.specialization
  if (!user || !moveId || user.injury) return
  const move = moveById(moveId)
  if (!move || !moveFitsPosition(move, user.position)) return

  const moves = (user.moves ??= [])
  let record = moves.find((item) => item.moveId === move.id)
  if (!record) {
    if (!move.unlock.via.includes('specialization')) return
    record = { moveId: move.id, level: 0, progress: 0 }
    moves.push(record)
  }
  if (record.level >= MOVE_MAX_LEVEL) return

  record.progress += SPECIALIZATION_PROGRESS
  grantExp(world, SPECIALIZATION_EXP, 'specialization')
  promote(world, user, move, record)
}
