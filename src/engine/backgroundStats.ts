import { clamp, positionGroup, round1, selectLineup } from '../domain'
import type { Club, Fixture, Id, MatchGoal, MatchReport, Player, WorldState } from '../domain'
import type { Rng } from '../lib'
import { createRng } from '../lib'

/** 背景比赛过去只写比分，球员整季数据全是 0：金靴白送、队友页空白。这里把一场比赛记到首发 11 人头上。 */

const APPEARANCE_MINUTES = 90

const GROUP_SHOT_WEIGHT: Record<'GK' | 'DEF' | 'MID' | 'FWD', number> = {
  FWD: 4.2,
  MID: 1.8,
  DEF: 0.45,
  GK: 0.02,
}

function shotWeight(player: Player): number {
  return GROUP_SHOT_WEIGHT[positionGroup(player.position)] * (0.5 + player.attributes.shooting / 100)
}

function passWeight(player: Player): number {
  const group = positionGroup(player.position)
  const base = group === 'MID' ? 1.5 : group === 'FWD' ? 1.2 : group === 'DEF' ? 0.55 : 0.08
  return base * (0.5 + player.attributes.passing / 100)
}

function ratingFor(rng: Rng, goals: number, assists: number): number {
  return round1(clamp(6.35 + rng.float(-0.35, 0.5) + goals * 0.55 + assists * 0.35, 4.6, 9.1))
}

function recordAppearance(player: Player, goals: number, assists: number, rng: Rng): void {
  player.seasonStats.appearances += 1
  player.seasonStats.starts += 1
  player.seasonStats.minutes += APPEARANCE_MINUTES
  player.seasonStats.ratingCount += 1
  player.seasonStats.ratingSum += ratingFor(rng, goals, assists)
}

function creditMatch(player: Player, goals: number, assists: number, rng: Rng): void {
  player.seasonStats.goals += goals
  player.seasonStats.assists += assists
  recordAppearance(player, goals, assists, rng)
}

function tallyById(goals: MatchGoal[], pick: (goal: MatchGoal) => Id | undefined): Map<Id, number> {
  const counts = new Map<Id, number>()
  for (const goal of goals) {
    const id = pick(goal)
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}

/**
 * 主角那场比赛的双方首发也要留下场痕迹，否则队友页整季 0 出场。
 * 进球与助攻由 `matchFinalize.tallyGoalStats` 单独记，这里只按首发名单记出场/分钟/评分；
 * 引擎不模拟 AI 换人，所以分钟按整场计。
 */
export function creditMatchStarters(world: WorldState, report: MatchReport): void {
  const rng = createRng(world.seed, 'matchline-stats', report.fixtureId)
  const scored = tallyById(report.goals, (goal) => goal.scorerId)
  const assisted = tallyById(report.goals, (goal) => goal.assistId)
  for (const side of ['home', 'away'] as const) {
    for (const entry of report.lineups?.[side] ?? []) {
      if (entry.id === world.playerId) continue
      const player = world.players[entry.id]
      if (player) recordAppearance(player, scored.get(entry.id) ?? 0, assisted.get(entry.id) ?? 0, rng)
    }
  }
}

function pickBy(rng: Rng, candidates: Player[], weightOf: (player: Player) => number): Player {
  return rng.weighted(candidates.map((player) => ({ value: player, weight: weightOf(player) })))
}

function tallySide(world: WorldState, club: Club, goals: number, rng: Rng): void {
  const lineup = selectLineup(club, world.players)
  if (lineup.length === 0) return

  const scored = new Map<Id, number>()
  const assisted = new Map<Id, number>()
  for (let index = 0; index < goals; index += 1) {
    const scorer = pickBy(rng, lineup, shotWeight)
    scored.set(scorer.id, (scored.get(scorer.id) ?? 0) + 1)
    const passers = lineup.filter((player) => player.id !== scorer.id)
    if (passers.length > 0 && rng.chance(0.7)) {
      const assister = pickBy(rng, passers, passWeight)
      assisted.set(assister.id, (assisted.get(assister.id) ?? 0) + 1)
    }
  }

  for (const player of lineup) {
    creditMatch(player, scored.get(player.id) ?? 0, assisted.get(player.id) ?? 0, rng)
  }
}

export function applyBackgroundMatchStats(
  world: WorldState,
  fixture: Fixture,
  homeClub: Club,
  awayClub: Club,
): void {
  const rng = createRng(world.seed, 'background-stats', fixture.id)
  tallySide(world, homeClub, fixture.homeGoals ?? 0, rng)
  tallySide(world, awayClub, fixture.awayGoals ?? 0, rng)
}
