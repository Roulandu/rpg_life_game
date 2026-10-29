import { describe, expect, it } from 'vitest'
import { ATTR_KEYS, clamp, round1 } from '../../src/domain/attributes'
import type { KeyMoment, KeyMomentKind, MatchReport, WorldState } from '../../src/domain/types'
import { optionsFor, type KindContext } from '../../src/engine/data/keyMomentOptions'
import {
  autoResolveKeyMoments,
  finalizeMatchday,
  hasPendingKeyMoments,
  resolveKeyMoment,
} from '../../src/engine/keyMoments'
import { hashState } from '../../src/lib/rng'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'
import { playToKeyMoments } from '../fixtures/matchday'

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
  it('generates 2-4 ordered moments for a played match', () => {
    const { report } = playToKeyMoments()
    const moments = report.keyMoments ?? []

    expect(moments.length).toBeGreaterThanOrEqual(2)
    expect(moments.length).toBeLessThanOrEqual(4)
    expect(moments.every((moment) => moment.outcome === undefined)).toBe(true)
    expect(moments.every((moment) => moment.minute > 0 && moment.minute <= 90)).toBe(true)
    for (let index = 1; index < moments.length; index += 1) {
      expect(moments[index]!.minute).toBeGreaterThan(moments[index - 1]!.minute)
    }
    for (const moment of moments) {
      expect(moment.options.length).toBeGreaterThanOrEqual(3)
      expect(moment.roll).toBeGreaterThanOrEqual(0)
      expect(moment.roll).toBeLessThan(1)
      const chances = moment.options.map((option) => option.successChance)
      expect(chances.every((value) => value > 0 && value < 1)).toBe(true)
      const safe = moment.options.find((option) => option.id === moment.defaultOptionId)
      expect(safe?.successChance).toBe(Math.max(...chances))
    }
  })

  it('applies the chosen option and only allows the next pending moment', () => {
    const { world, report } = playToKeyMoments()
    const user = world.players[world.playerId]
    const moments = report.keyMoments ?? []
    const first = moments[0]!
    const choice = first.options[0]!
    const ratingBefore = report.userRating
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

    if (ratingBefore != null && report.userRating != null) {
      const expected = clamp(round1(ratingBefore + (outcome?.ratingDelta ?? 0)), 4.3, 9.9)
      expect(report.userRating).toBeCloseTo(expected, 5)
    }
    expect(user.morale).toBeCloseTo(clamp(moraleBefore + (outcome?.moraleDelta ?? 0), 0, 100), 5)
    expect(user.form).toBeCloseTo(clamp(round1(formBefore + (outcome?.ratingDelta ?? 0) * 4), 0, 100), 5)
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

  it('rewards a converted chance with a goal and updates the score', () => {
    const { world, report } = playToKeyMoments()
    let moment: KeyMoment | null = null
    let beforeGoals = 0
    let beforeTotal = 0

    for (const candidate of report.keyMoments ?? []) {
      const scoring = candidate.options.find((option) => option.goalOnSuccess)
      if (scoring) {
        candidate.roll = 0
        beforeGoals = report.userGoals
        beforeTotal = report.homeGoals + report.awayGoals
        moment = candidate
        resolveKeyMoment(world, candidate.id, scoring.id)
        break
      }
      resolveKeyMoment(world, candidate.id, candidate.defaultOptionId)
    }

    expect(moment).not.toBeNull()
    expect(moment!.outcome?.success).toBe(true)
    expect(moment!.outcome?.goal).toBe(true)
    expect(report.userGoals).toBe(beforeGoals + 1)
    expect(report.homeGoals + report.awayGoals).toBe(beforeTotal + 1)

    const fixture = world.fixtures[report.fixtureId]!
    expect(fixture.homeGoals).toBe(report.homeGoals)
    expect(fixture.awayGoals).toBe(report.awayGoals)
    const news = world.news.find((item) => item.id === `news:match:${report.fixtureId}`)
    expect(news?.title).toContain(`${report.homeGoals}-${report.awayGoals}`)
    expect(news?.body).toContain(`${report.userRating?.toFixed(1)} 分`)

    const fulltime = report.events.find((event) => event.type === 'fulltime')
    expect(fulltime?.text).toContain(`${report.homeGoals}-${report.awayGoals}`)
    if (moment!.minute <= 45 && report.halfTimeHomeGoals != null && report.halfTimeAwayGoals != null) {
      const halftime = report.events.find((event) => event.type === 'info' && event.minute === 45)
      expect(halftime?.text).toContain(
        `${report.halfTimeHomeGoals}-${report.halfTimeAwayGoals}`,
      )
    }
  })

  it('credits a team goal for an assisted chance', () => {
    const { world, report } = playToKeyMoments()
    let moment: KeyMoment | null = null
    let beforeAssists = 0
    let beforeTotal = 0

    for (const candidate of report.keyMoments ?? []) {
      const assisting = candidate.options.find((option) => option.assistOnSuccess)
      if (assisting) {
        candidate.roll = 0
        beforeAssists = report.userAssists
        beforeTotal = report.homeGoals + report.awayGoals
        moment = candidate
        resolveKeyMoment(world, candidate.id, assisting.id)
        break
      }
      resolveKeyMoment(world, candidate.id, candidate.defaultOptionId)
    }

    expect(moment).not.toBeNull()
    expect(moment!.outcome?.assist).toBe(true)
    expect(report.userAssists).toBe(beforeAssists + 1)
    expect(report.homeGoals + report.awayGoals).toBe(beforeTotal + 1)

    const fixture = world.fixtures[report.fixtureId]!
    expect(fixture.homeGoals).toBe(report.homeGoals)
    expect(fixture.awayGoals).toBe(report.awayGoals)
    const fulltime = report.events.find((event) => event.type === 'fulltime')
    expect(fulltime?.text).toContain(`${report.homeGoals}-${report.awayGoals}`)
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
      expect(options.map((option) => option.id)).toEqual(ids)
      expect(options.map((option) => Number(option.successChance.toFixed(3)))).toEqual(chances)
    }
  })
})
