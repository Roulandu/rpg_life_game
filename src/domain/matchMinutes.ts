import type { MatchLineupPlayer, MatchReport } from './matchTypes'

type EntrySource = Pick<MatchReport, 'userPlayed' | 'userStarted' | 'userMinutes'>

/** 登场分钟由已有三字段派生，不是第二份存档事实：首发 0，替补 90 减出场分钟，未出场整场不在场上。 */
export function userEntryMinuteOf(report: EntrySource): number {
  if (!report.userPlayed) return 90
  return report.userStarted ? 0 : 90 - report.userMinutes
}

/** 分钟闸门：非主角恒在场上，主角只在登场分钟之后才算在场上。 */
export function onPitchAt(
  player: Pick<MatchLineupPlayer, 'isUser'>,
  entryMinute: number,
  minute: number,
): boolean {
  return !player.isUser || minute >= entryMinute
}
