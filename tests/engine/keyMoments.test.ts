import { describe, expect, it } from 'vitest'
import { ATTR_KEYS, clamp } from '../../src/domain/attributes'
import type { KeyMoment, KeyMomentKind, MatchReport, WorldState } from '../../src/domain/types'
import { optionsFor, type KindContext } from '../../src/engine/data/keyMomentOptions'
import {
  autoResolveKeyMoments,
  finalizeMatchday,
  hasPendingKeyMoments,
  resolveKeyMoment,
} from '../../src/engine/keyMoments'
import { computeUserRating } from '../../src/engine/matchUser'
import { migrateWorld } from '../../src/db/migrate'
import { createRng, hashState } from '../../src/lib/rng'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'
import { playToKeyMoments, readyWorld } from '../fixtures/matchday'
import { legacyWorld } from '../fixtures/legacySave'

function resolveAllWithDefaults(world: WorldState): MatchReport {
  let report = world.lastMatch
  expect(report).not.toBeNull()
  for (const moment of report?.keyMoments ?? []) {
    resolveKeyMoment(world, moment.id, moment.defaultOptionId)
  }
  finalizeMatchday(world)
  report = world.lastMatch
  return report as MatchReport
}

describe('key moments', () => {
  it('generates 5-7 ordered moments with five options each', () => {
    const { report } = playToKeyMoments()
    const moments = report.keyMoments ?? []

    expect(moments.length).toBeGreaterThanOrEqual(5)
    expect(moments.length).toBeLessThanOrEqual(7)
    expect(moments.every((moment) => moment.outcome === undefined)).toBe(true)
    expect(moments.every((moment) => moment.minute > 0 && moment.minute <= 90)).toBe(true)
    for (let index = 1; index < moments.length; index += 1) {
      expect(moments[index]!.minute).toBeGreaterThan(moments[index - 1]!.minute)
    }
    for (const moment of moments) {
      expect(moment.options).toHaveLength(5)
      expect(new Set(moment.options.map((option) => option.id)).size).toBe(5)
      expect(moment.triggerZh?.length ?? 0).toBeGreaterThan(0)
      expect(moment.roll).toBeGreaterThanOrEqual(0)
      expect(moment.roll).toBeLessThan(1)
      const chances = moment.options.map((option) => option.successChance)
      expect(chances.every((value) => value > 0 && value < 1)).toBe(true)
      const safe = moment.options.find((option) => option.id === moment.defaultOptionId)
      expect(safe?.successChance).toBe(Math.max(...chances))
    }
  })

  it('resolveKeyMoment 传 advance=false 时停在当前分钟', () => {
    const { world, report } = playToKeyMoments()
    const moment = report.keyMoments![0]!
    expect(report.currentMinute).toBe(moment.minute)

    resolveKeyMoment(world, moment.id, moment.defaultOptionId, { advance: false })

    expect(moment.outcome).toBeDefined()
    expect(report.currentMinute).toBe(moment.minute)
  })

  it('applies the chosen option and only allows the next pending moment', () => {
    const { world, report } = playToKeyMoments()
    const user = world.players[world.playerId]
    const moments = report.keyMoments ?? []
    const first = moments[0]!
    const choice = first.options[0]!
    const moraleBefore = user.morale
    const formBefore = user.form

    if (moments[1]) {
      expect(resolveKeyMoment(world, moments[1].id, moments[1].defaultOptionId)).toBeNull()
    }
    expect(resolveKeyMoment(world, first.id, 'not-a-real-option')).toBeNull()

    const resolved = resolveKeyMoment(world, first.id, choice.id)
    expect(resolved).not.toBeNull()
    const outcome = first.outcome
    expect(outcome?.optionId).toBe(choice.id)
    expect(outcome?.success).toBe(first.roll < choice.successChance)
    expect(outcome?.textZh.length).toBeGreaterThan(0)
    expect(report.events.some((event) => event.text === outcome?.textZh)).toBe(true)

    expect(report.userRating).toBeNull()
    expect(user.morale).toBeCloseTo(clamp(moraleBefore + (outcome?.moraleDelta ?? 0), 0, 100), 5)
    expect(user.form).toBe(formBefore)
  })

  it('auto-resolving equals choosing the safe option every time', () => {
    const watched = playToKeyMoments().world
    const skipped = playToKeyMoments().world

    resolveAllWithDefaults(watched)
    autoResolveKeyMoments(skipped)
    finalizeMatchday(skipped)

    expect(hasPendingKeyMoments(watched)).toBe(false)
    expect(hasPendingKeyMoments(skipped)).toBe(false)
    expect(hashState(skipped)).toBe(hashState(watched))
  })
})

describe('live key moment outcomes', () => {
  it('rewards a converted chance with a live goal and updates the score', () => {
    const { world, report } = playToKeyMoments()
    let moment: KeyMoment | null = null

    for (const candidate of report.keyMoments ?? []) {
      const scoring = candidate.options.find((option) => option.goalOnSuccess)
      if (scoring) {
        candidate.roll = 0
        moment = candidate
        resolveKeyMoment(world, candidate.id, scoring.id)
        break
      }
      resolveKeyMoment(world, candidate.id, candidate.defaultOptionId)
    }

    expect(moment).not.toBeNull()
    expect(moment!.outcome?.success).toBe(true)
    expect(moment!.outcome?.goal).toBe(true)

    const liveGoal = report.goals.find(
      (goal) => goal.fromKeyMoment && goal.minute === moment!.minute && goal.isUser,
    )
    expect(liveGoal).toBeDefined()
    expect(report.userGoals).toBeGreaterThanOrEqual(1)
    expect(report.homeGoals + report.awayGoals).toBe(report.goals.length)

    const fixture = world.fixtures[report.fixtureId]!
    expect(fixture.homeGoals).toBe(report.homeGoals)
    expect(fixture.awayGoals).toBe(report.awayGoals)

    resolveAllWithDefaults(world)
    const final = world.lastMatch as MatchReport
    const news = world.news.find((item) => item.id === `news:match:${report.fixtureId}`)
    expect(news?.title).toContain(`${final.homeGoals}-${final.awayGoals}`)
    expect(news?.body).toContain(`${final.userRating?.toFixed(1)} 分`)

    const fulltime = final.events.find((event) => event.type === 'fulltime')
    expect(fulltime?.text).toContain(`${final.homeGoals}-${final.awayGoals}`)
    if (moment!.minute <= 45 && final.halfTimeHomeGoals != null && final.halfTimeAwayGoals != null) {
      const halftime = final.events.find((event) => event.type === 'info' && event.minute === 45)
      expect(halftime?.text).toContain(`${final.halfTimeHomeGoals}-${final.halfTimeAwayGoals}`)
    }
  })

  it('credits a live team goal for an assisted chance', () => {
    const { world, report } = playToKeyMoments()
    let moment: KeyMoment | null = null
    const userId = world.playerId

    for (const candidate of report.keyMoments ?? []) {
      const assisting = candidate.options.find((option) => option.assistOnSuccess)
      if (assisting) {
        candidate.roll = 0
        moment = candidate
        resolveKeyMoment(world, candidate.id, assisting.id)
        break
      }
      resolveKeyMoment(world, candidate.id, candidate.defaultOptionId)
    }

    expect(moment).not.toBeNull()
    expect(moment!.outcome?.assist).toBe(true)

    const assistedGoal = report.goals.find(
      (goal) => goal.fromKeyMoment && goal.minute === moment!.minute && goal.isUserAssist,
    )
    expect(assistedGoal).toBeDefined()
    expect(assistedGoal!.scorerId).not.toBe(userId)
    expect(report.userAssists).toBeGreaterThanOrEqual(1)
    expect(report.homeGoals + report.awayGoals).toBe(report.goals.length)

    const fixture = world.fixtures[report.fixtureId]!
    expect(fixture.homeGoals).toBe(report.homeGoals)
    expect(fixture.awayGoals).toBe(report.awayGoals)

    resolveAllWithDefaults(world)
    const fulltime = world.lastMatch?.events.find((event) => event.type === 'fulltime')
    expect(fulltime?.text).toContain(
      `${world.lastMatch?.homeGoals}-${world.lastMatch?.awayGoals}`,
    )
  })

  it('produces a media reaction once every moment is resolved', () => {
    const { world, report } = playToKeyMoments()
    expect(report.mediaReaction).toBeUndefined()
    resolveAllWithDefaults(world)
    expect(world.lastMatch?.mediaReaction).toBeTruthy()
    expect(world.lastMatch?.mediaReaction).toContain(world.players[world.playerId]!.name)
    const news = world.news.find((item) => item.id === `news:match:${report.fixtureId}`)
    expect(news?.body).toContain(`${world.lastMatch?.userRating?.toFixed(1)} 分`)
  })
})

describe('key moment settlement', () => {
  it('终场评分计入所有关键回合的评分增量', () => {
    const world = readyWorld(2026)
    const user = world.players[world.playerId]
    const base = { user, goals: 0, assists: 0, goalsFor: 1, goalsAgainst: 0, minutes: 90, played: true }
    const plain = computeUserRating({
      ...base,
      keyMomentDelta: 0,
      rng: createRng(world.seed, 'rating'),
    })
    const boosted = computeUserRating({
      ...base,
      keyMomentDelta: 0.5,
      rng: createRng(world.seed, 'rating'),
    })
    expect(plain).not.toBeNull()
    expect(boosted! - plain!).toBeCloseTo(0.5, 5)
  })

  it('form 只在终场结算时变化', () => {
    const { world, report } = playToKeyMoments()
    const user = world.players[world.playerId]
    const formBefore = user.form

    autoResolveKeyMoments(world)
    expect(user.form).toBe(formBefore)
    expect(report.userRating).toBeNull()

    finalizeMatchday(world)
    expect(user.form).not.toBe(formBefore)
    expect(report.userRating).not.toBeNull()
  })

  it('旧版 final 报告上的待处理回合仍按旧逻辑结算并刷新新闻', () => {
    const world = migrateWorld(legacyWorld())
    const report = world.lastMatch as MatchReport
    const user = world.players[world.playerId]
    const beforeGoals = user.seasonStats.goals
    const beforeTotal = report.homeGoals + report.awayGoals
    const moment = report.keyMoments![0]!
    world.news.unshift({
      id: `news:match:${report.fixtureId}`,
      season: report.season,
      week: report.week,
      title: '旧标题',
      body: '旧内容',
      kind: 'match',
    })

    expect(resolveKeyMoment(world, moment.id, 'shoot')).not.toBeNull()

    expect(moment.outcome?.success).toBe(true)
    expect(report.userGoals).toBe(2)
    expect(report.homeGoals + report.awayGoals).toBe(beforeTotal + 1)
    expect(user.seasonStats.goals).toBe(beforeGoals + 1)
    expect(report.userRating).toBeGreaterThan(7.2)
    const news = world.news.find((item) => item.id === `news:match:${report.fixtureId}`)
    expect(news?.title).toContain(`${report.homeGoals}-${report.awayGoals}`)
    expect(news?.body).toContain('球')

    finalizeMatchday(world)
    expect(report.mediaReaction).toContain(user.name)
  })
})

describe('key moment option formulas', () => {
  const table: [KeyMomentKind, string[], number[]][] = [
    ['bigChance', ['shoot', 'square', 'hold'], [0.74, 0.756, 0.92]],
    ['penalty', ['placed', 'power', 'panenka'], [0.864, 0.764, 0.676]],
    ['throughBall', ['thread', 'simple', 'carry'], [0.708, 0.878, 0.736]],
    ['duel', ['commit', 'contain', 'foul'], [0.72, 0.844, 0.84]],
    ['save', ['reflex', 'position', 'rush'], [0.76, 0.816, 0.76]],
    ['clearance', ['hoof', 'calm', 'shield'], [0.9, 0.768, 0.85]],
  ]

  it('keeps option ids and success chances for a 92-attribute player', () => {
    const world = generateWorld(testOptions({ seed: 7 }), TEST_NOW)
    const player = world.players[world.playerId]
    for (const key of ATTR_KEYS) player.attributes[key] = 92
    const context: KindContext = { player, isHome: true }
    for (const [kind, ids, chances] of table) {
      const options = optionsFor(kind, context)
      expect(options).toHaveLength(5)
      expect(options.slice(0, 3).map((option) => option.id)).toEqual(ids)
      expect(options.slice(0, 3).map((option) => Number(option.successChance.toFixed(3)))).toEqual(chances)
    }
  })
})
