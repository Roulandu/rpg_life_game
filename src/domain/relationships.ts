import type { Id, Relationship } from './types'

/**
 * 职责：名宿这条关系的唯一定义处——世界生成与旧档迁移都从这里取值，保证两边 id 与文案一致。
 * 边界：名宿不是某个具体球员，是「俱乐部里愿意教你的人」这一角色，所以按 userId 建键而不挂球员 id。
 * 依赖：只依赖 ./types 的关系结构，被 src/world 与 src/db 共用（domain 是两者都允许的下层）。
 */
export const LEGEND_NAME = '俱乐部名宿'
export const LEGEND_SUMMARY = '俱乐部大厅照片里的那个人，偶尔会来训练场边站一会儿。'
export const LEGEND_START_TRUST = 40

export function legendRelationshipId(userId: Id): Id {
  return `rel:legend:${userId}`
}

export function makeLegendRelationship(userId: Id): Relationship {
  const id = legendRelationshipId(userId)
  return {
    id,
    name: LEGEND_NAME,
    nameZh: LEGEND_NAME,
    role: 'legend',
    trust: LEGEND_START_TRUST,
    tension: 0,
    summary: LEGEND_SUMMARY,
    lastInteractionWeek: 0,
  }
}
