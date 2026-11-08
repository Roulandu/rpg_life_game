import type { WorldState } from './types'

/**
 * 职责：删掉跨季之后引擎自己也不会再读的死数据——往季赛程与往季没处理完的事件。
 * 边界：只按 `season` 与 `status` 这两个引擎已经写好的事实判断，不猜赛程含义，也不动当季任何东西；
 * 玩家亲手处理过（`resolved`）的事件一定留下，收件箱历史与「那年我选了什么」靠它读。
 * 依赖：只读世界结构，不碰引擎与计时钟，所以存档迁移也能直接调用同一条规则。
 */
export function pruneFinishedSeason(world: WorldState): void {
  const current = world.season
  for (const [id, fixture] of Object.entries(world.fixtures)) {
    if (fixture.season < current) delete world.fixtures[id]
  }
  for (const [id, event] of Object.entries(world.events)) {
    if (event.season < current && event.status !== 'resolved') delete world.events[id]
  }
}
