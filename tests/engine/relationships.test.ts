import { describe, expect, it } from 'vitest'
import type { Relationship, WorldState } from '../../src/domain/types'
import {
  adjustRelationship,
  adjustRoleTrust,
  coachTrust,
  getRelationshipByRole,
  getRelationshipsByRole,
  relationshipLabel,
} from '../../src/engine/relationships'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

function makeRelationship(role: Relationship['role'], trust: number, tension: number): Relationship {
  return { id: `rel:${role}`, role, name: role, trust, tension, summary: '' }
}

describe('engine relationships', () => {
  const world = generateWorld(testOptions(), TEST_NOW)

  it('finds relationships by role', () => {
    const coach = getRelationshipByRole(world, 'coach')
    expect(coach?.role).toBe('coach')
    expect(coachTrust(world)).toBe(coach?.trust ?? 50)
    expect(getRelationshipsByRole(world, 'coach').every((item) => item.role === 'coach')).toBe(true)
  })

  it('returns the default coach trust when there is no coach', () => {
    const empty: WorldState = { ...world, relationships: {} }
    expect(coachTrust(empty)).toBe(50)
    expect(getRelationshipByRole(empty, 'coach')).toBeUndefined()
  })

  it('clamps trust and tension when adjusting', () => {
    const relationship = makeRelationship('coach', 95, 5)
    adjustRelationship(relationship, 20, -20)
    expect(relationship.trust).toBe(100)
    expect(relationship.tension).toBe(0)
    adjustRelationship(undefined, 10, 10)
  })

  it('adjusts every relationship of a role', () => {
    const relationships: Record<string, Relationship> = {
      a: makeRelationship('teammate', 50, 50),
      b: makeRelationship('teammate', 60, 40),
      c: makeRelationship('coach', 50, 50),
    }
    const adjusted: WorldState = { ...world, relationships }
    adjustRoleTrust(adjusted, 'teammate', 10, -10)
    expect(relationships.a.trust).toBe(60)
    expect(relationships.a.tension).toBe(40)
    expect(relationships.b.trust).toBe(70)
    expect(relationships.c.trust).toBe(50)
  })

  it('labels every relationship role', () => {
    expect(relationshipLabel('coach')).toBe('主教练')
    expect(relationshipLabel('teammate')).toBe('队友')
    expect(relationshipLabel('agent')).toBe('经纪人')
    expect(relationshipLabel('family')).toBe('家人')
    expect(relationshipLabel('media')).toBe('媒体')
    expect(relationshipLabel('fan')).toBe('球迷')
  })
})
