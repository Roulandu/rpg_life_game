import type { MatchReport, WorldState } from '../../src/domain/types'

export const LATIN = /[A-Za-z]/

/** 阵容里仍写拉丁原名的球员名：任何玩家可见文本命中它，就说明汉化没做干净。 */
export function latinPlayerNames(world: WorldState): string[] {
  return Object.values(world.players)
    .map((player) => player.name)
    .filter((name) => LATIN.test(name))
}

/** 战报里玩家能读到的每一句：媒体点评、事件行、关键回合文案。 */
export function reportTexts(report: MatchReport): string[] {
  return [
    report.mediaReaction ?? '',
    ...report.events.map((line) => line.text),
    ...(report.keyMoments ?? []).flatMap((moment) => [
      moment.titleZh,
      moment.promptZh,
      moment.triggerZh ?? '',
      moment.outcome?.textZh ?? '',
    ]),
  ]
}

/** texts 中命中任一 names 的条目。 */
export function leaks(texts: string[], names: string[]): string[] {
  return texts.filter((text) => names.some((name) => text.includes(name)))
}
