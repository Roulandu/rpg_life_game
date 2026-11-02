import {
  MOVE_LEVEL_MARKS,
  MOVE_MAX_LEVEL,
  displayName,
  nextMoveLevel,
} from '../domain'
import type { MoveDefinition, Player, WorldState } from '../domain'
import { dailyId } from './dayContext'

/**
 * 职责：绝技「修炼进度」的唯一落地口——特训与比赛掉落都通过它攒进度、跨门槛升级并写新闻。
 * 边界：满级之后不再攒进度；等级 0 的记录是「还没学会」，攒满一格才第一次升到 1 级。
 * 依赖：src/domain 的 nextMoveLevel（门槛与进度双条件）与 ./dayContext 的日维度新闻 id。
 */
export type MoveTrainSource = 'specialization' | 'matchDrop'

const SOURCE_PHRASE: Record<MoveTrainSource, string> = {
  specialization: '在这一周的特训里',
  matchDrop: '在这场硬仗里',
}

function announce(world: WorldState, user: Player, move: MoveDefinition, level: number, source: MoveTrainSource): void {
  const mark = MOVE_LEVEL_MARKS[level - 1] ?? ''
  world.news.unshift({
    id: dailyId(world, `news:move:${source}`, move.id),
    season: world.season,
    week: world.week,
    day: world.day,
    title: level === 1 ? `学会${move.nameZh}` : `${move.nameZh} 练到 ${mark} 级`,
    body: `${displayName(user)} ${SOURCE_PHRASE[source]}把 ${move.nameZh} 练成了 ${mark} 级，下次遇到对位球员时这一档会真的写进成功率。`,
    kind: 'club',
  })
}

/** 攒一次进度：返回 false 表示这条绝技已经练到尽头，调用方据此决定还要不要发经验。 */
export function trainMove(
  world: WorldState,
  user: Player,
  move: MoveDefinition,
  gain: number,
  source: MoveTrainSource,
): boolean {
  const moves = (user.moves ??= [])
  let record = moves.find((item) => item.moveId === move.id)
  if (!record) {
    record = { moveId: move.id, level: 0, progress: 0 }
    moves.push(record)
  }
  if (record.level >= MOVE_MAX_LEVEL) return false

  record.progress += gain
  const next = nextMoveLevel(user, move)
  if (!next) return true
  record.level = next.level
  record.progress = next.progress
  announce(world, user, move, next.level, source)
  return true
}
