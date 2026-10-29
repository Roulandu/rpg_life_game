import { describe, expect, it } from 'vitest'
import {
  selectActionLabel,
  selectClubFixtures,
  selectPendingKeyMoments,
  selectProviderDefaults,
  selectStartingClubs,
} from '../../src/store/selectors'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

describe('store selectors', () => {
  const world = generateWorld(testOptions(), TEST_NOW)

  it('reports pending key moments only when a world exists', () => {
    expect(selectPendingKeyMoments(null)).toBe(false)
    expect(selectPendingKeyMoments(world)).toBe(false)
  })

  it('returns the club season fixtures for the user club', () => {
    const fixtures = selectClubFixtures(world)
    expect(fixtures).toHaveLength(38)
    expect(fixtures.every((fixture) => fixture.homeId === world.clubId || fixture.awayId === world.clubId)).toBe(true)
    expect(selectClubFixtures(null)).toHaveLength(0)
  })

  it('exposes the starting club options', () => {
    const clubs = selectStartingClubs()
    expect(clubs.length).toBeGreaterThan(0)
    expect(clubs[0]?.id).toBe('club:ENG:2:01')
  })

  it('resolves chat action labels', () => {
    expect(selectActionLabel('talk_coach')).toBe('与教练谈话')
    expect(selectActionLabel('none')).toBeNull()
    expect(selectActionLabel(undefined)).toBeNull()
  })

  it('returns provider defaults for the settings form', () => {
    expect(selectProviderDefaults('anthropic')).toEqual({
      baseUrl: 'https://api.anthropic.com',
      model: 'claude-sonnet-4-5',
    })
    expect(selectProviderDefaults('openai').model).toBe('gpt-4.1-mini')
  })
})
