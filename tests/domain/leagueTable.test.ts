import { describe, expect, it } from 'vitest'
import type { WorldState } from '../../src/domain/types'
import { computeLeagueTable, goalDifference, leaguePosition } from '../../src/domain/leagueTable'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

function markPlayed(world: WorldState, count: number, homeGoals: number, awayGoals: number): WorldState {
  const fixtures = { ...world.fixtures }
  const league = world.leagues[world.clubs[world.clubId].leagueId]!
  const ids = Object.values(fixtures)
    .filter((fixture) => fixture.competitionId === league.id && fixture.season === world.season)
    .sort((a, b) => a.week - b.week || a.id.localeCompare(b.id))
    .slice(0, count)
    .map((fixture) => fixture.id)
  for (const id of ids) {
    fixtures[id] = { ...fixtures[id]!, status: 'played', homeGoals, awayGoals }
  }
  return { ...world, fixtures }
}

describe('domain league table', () => {
  const world = generateWorld(testOptions(), TEST_NOW)

  it('returns an all-zero table before any match is played', () => {
    const league = world.leagues[world.clubs[world.clubId].leagueId]!
    const table = computeLeagueTable(world, league.id)
    expect(table).toHaveLength(20)
    expect(table.every((row) => row.played === 0 && row.points === 0)).toBe(true)
  })

  it('returns an empty table for an unknown league', () => {
    expect(computeLeagueTable(world, 'league:missing')).toEqual([])
  })

  it('awards three points for a win and keeps goals balanced', () => {
    const played = markPlayed(world, 5, 2, 0)
    const league = played.leagues[played.clubs[played.clubId].leagueId]!
    const table = computeLeagueTable(played, league.id)
    const goalsFor = table.reduce((sum, row) => sum + row.goalsFor, 0)
    const goalsAgainst = table.reduce((sum, row) => sum + row.goalsAgainst, 0)
    expect(goalsFor).toBe(goalsAgainst)
    expect(table[0]!.points).toBeGreaterThanOrEqual(table[table.length - 1]!.points)
    expect(table.some((row) => row.won > 0)).toBe(true)
  })

  it('sorts by points then goal difference then goals for', () => {
    const played = markPlayed(world, 10, 3, 1)
    const league = played.leagues[played.clubs[played.clubId].leagueId]!
    const table = computeLeagueTable(played, league.id)
    for (let index = 1; index < table.length; index += 1) {
      expect(table[index - 1]!.points).toBeGreaterThanOrEqual(table[index]!.points)
    }
  })

  it('computes goal difference and league position', () => {
    const played = markPlayed(world, 5, 2, 0)
    const league = played.leagues[played.clubs[played.clubId].leagueId]!
    const table = computeLeagueTable(played, league.id)
    const top = table[0]!
    expect(goalDifference(top)).toBe(top.goalsFor - top.goalsAgainst)
    const position = leaguePosition(played, top.clubId)
    expect(position).toBe(1)
    expect(leaguePosition(played, 'club:missing')).toBe(0)
  })

  it('keeps only the last five form entries', () => {
    const played = markPlayed(world, 20, 1, 0)
    const league = played.leagues[played.clubs[played.clubId].leagueId]!
    const table = computeLeagueTable(played, league.id)
    expect(table.every((row) => row.form.length <= 5)).toBe(true)
  })
})
