import { clamp, round1 } from '../domain'
import type {
  Club,
  Fixture,
  KeyMoment,
  MatchEventLine,
  MatchGoal,
  MatchLineups,
  MatchReport,
  MatchStatLine,
  MatchStats,
  Player,
} from '../domain'
import type { Rng } from '../lib'

export interface LiveReportSetup {
  user: Player
  homeClub: Club
  awayClub: Club
  userStarted: boolean
  userMinutes: number
  userPlayed: boolean
  lineups: MatchLineups
}

export function emptyStats(): MatchStats {
  return {
    home: { possession: 0, shots: 0, shotsOnTarget: 0, corners: 0 },
    away: { possession: 0, shots: 0, shotsOnTarget: 0, corners: 0 },
  }
}

export function addBeatStats(
  report: MatchReport,
  stats: { home: Partial<MatchStatLine>; away: Partial<MatchStatLine> },
): void {
  if (!report.stats) report.stats = emptyStats()
  for (const side of ['home', 'away'] as const) {
    const line = report.stats[side]
    const delta = stats[side]
    line.possession += delta.possession ?? 0
    line.shots += delta.shots ?? 0
    line.shotsOnTarget += delta.shotsOnTarget ?? 0
    line.corners += delta.corners ?? 0
  }
}

export function createLiveReport(
  fixture: Fixture,
  setup: LiveReportSetup,
  keyMoments: KeyMoment[],
  attendance: number,
): MatchReport {
  return {
    fixtureId: fixture.id,
    season: fixture.season,
    week: fixture.week,
    homeId: fixture.homeId,
    awayId: fixture.awayId,
    homeName: setup.homeClub.nameZh,
    awayName: setup.awayClub.nameZh,
    status: 'live',
    currentMinute: 0,
    homeGoals: 0,
    awayGoals: 0,
    goals: [],
    userPlayed: setup.userPlayed,
    userStarted: setup.userStarted,
    userMinutes: setup.userMinutes,
    userGoals: 0,
    userAssists: 0,
    userRating: null,
    userPosition: setup.user.position,
    events: [
      {
        minute: 0,
        type: 'info',
        text: `比赛开始，${setup.homeClub.nameZh} 在主场迎战 ${setup.awayClub.nameZh}。`,
      },
    ],
    motmName: '',
    motmRating: 0,
    attendance,
    keyMoments,
    stats: emptyStats(),
    lineups: setup.lineups,
  }
}

export function appendEvent(report: MatchReport, event: MatchEventLine): void {
  report.events.push(event)
  report.events.sort((a, b) => a.minute - b.minute)
}

export function appendGoal(report: MatchReport, fixture: Fixture, goal: MatchGoal): void {
  report.goals.push(goal)
  if (goal.side === 'home') report.homeGoals += 1
  else report.awayGoals += 1
  fixture.homeGoals = report.homeGoals
  fixture.awayGoals = report.awayGoals
  if (goal.isUser) report.userGoals += 1
  if (goal.isUserAssist) report.userAssists += 1
  if (report.stats) {
    const line = report.stats[goal.side]
    line.shots += 1
    line.shotsOnTarget += 1
  }
}

export function buildGoalText(report: MatchReport, goal: MatchGoal): string {
  const teamName = goal.side === 'home' ? report.homeName : report.awayName
  const assistText = goal.assistName ? ` 助攻：${goal.assistName}。` : ''
  return `第 ${goal.minute} 分钟，${goal.scorerName} 为 ${teamName} 破门！${assistText}`
}

export function enterHalfTime(report: MatchReport): void {
  if (report.halfTimeHomeGoals != null) return
  report.halfTimeHomeGoals = report.homeGoals
  report.halfTimeAwayGoals = report.awayGoals
  appendEvent(report, {
    minute: 45,
    type: 'info',
    text: `半场结束，${report.homeName} ${report.homeGoals}-${report.awayGoals} ${report.awayName}。`,
  })
}

export function appendFulltime(report: MatchReport): void {
  if (report.events.some((event) => event.type === 'fulltime')) return
  appendEvent(report, {
    minute: 90,
    type: 'fulltime',
    text: `全场结束，${report.homeName} ${report.homeGoals}-${report.awayGoals} ${report.awayName}。`,
  })
}

export function computeAttendance(homeClub: Club, rng: Rng): number {
  return clamp(Math.round(homeClub.reputation * 380 + rng.int(-3000, 4500)), 3200, 78000)
}

export function pickManOfTheMatch(
  report: MatchReport,
  user: Player,
  userRating: number | null,
  rng: Rng,
): { name: string; rating: number } {
  const goalCounts = new Map<string, { name: string; count: number }>()
  for (const goal of report.goals) {
    const existing = goalCounts.get(goal.scorerId)
    if (existing) existing.count += 1
    else goalCounts.set(goal.scorerId, { name: goal.scorerName, count: 1 })
  }
  const topScorer = [...goalCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([id, value]) => ({ id, ...value }))[0]

  const userHighlighted =
    userRating != null && (userRating >= 8.3 || topScorer?.id === user.id)
  const teamName = report.homeId === user.clubId ? report.homeName : report.awayName
  const name = userHighlighted ? user.name : (topScorer?.name ?? teamName)
  const rating = userHighlighted ? (userRating ?? 0) : round1(rng.float(7.2, 8.5))
  return { name, rating }
}
