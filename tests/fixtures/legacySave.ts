import type { Fixture, MatchReport, WorldState } from '../../src/domain/types'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from './career'

export const LEGACY_SAVE_VERSION = 1

function legacyReport(world: WorldState, fixture: Fixture): MatchReport {
  const user = world.players[world.playerId]
  const home = world.clubs[fixture.homeId]!
  const away = world.clubs[fixture.awayId]!
  return {
    fixtureId: fixture.id,
    season: fixture.season,
    week: fixture.week,
    homeId: fixture.homeId,
    awayId: fixture.awayId,
    homeName: home.nameZh,
    awayName: away.nameZh,
    homeGoals: 2,
    awayGoals: 1,
    halfTimeHomeGoals: 1,
    halfTimeAwayGoals: 0,
    userPlayed: true,
    userStarted: true,
    userMinutes: 90,
    userGoals: 1,
    userAssists: 0,
    userRating: 7.2,
    userPosition: user.position,
    events: [
      { minute: 0, type: 'info', text: '比赛开始。' },
      { minute: 45, type: 'info', text: `半场结束，${home.nameZh} 1-0 ${away.nameZh}。` },
      { minute: 90, type: 'fulltime', text: `全场结束，${home.nameZh} 2-1 ${away.nameZh}。` },
    ],
    motmName: user.name,
    motmRating: 7.2,
    attendance: 20000,
    keyMoments: [
      {
        id: `km:${user.id}:0`,
        minute: 20,
        kind: 'bigChance',
        titleZh: '禁区里的机会',
        promptZh: '球落到你脚下。',
        options: [
          {
            id: 'shoot',
            labelZh: '直接射门',
            descriptionZh: '自己解决。',
            successChance: 0.6,
            ratingOnSuccess: 0.75,
            ratingOnFail: -0.35,
            goalOnSuccess: true,
          },
        ],
        defaultOptionId: 'shoot',
        roll: 0.1,
      },
    ],
  } as unknown as MatchReport
}

export function legacyWorld(seed = 424242): WorldState {
  const world = generateWorld(testOptions({ seed }), TEST_NOW)
  const fixture = Object.values(world.fixtures).find(
    (item) => item.homeId === world.clubId || item.awayId === world.clubId,
  )
  if (!fixture) throw new Error('no user fixture')

  const report = legacyReport(world, fixture)
  fixture.status = 'played'
  fixture.homeGoals = report.homeGoals
  fixture.awayGoals = report.awayGoals
  fixture.report = report
  world.lastMatch = report
  world.version = LEGACY_SAVE_VERSION
  delete (world as { pendingWeekPlan?: unknown }).pendingWeekPlan

  return world
}
