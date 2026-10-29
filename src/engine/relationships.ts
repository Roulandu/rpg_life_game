import { clamp } from '../domain'
import type { Relationship, RelationshipRole, WorldState } from '../domain'

export function getRelationshipByRole(
  world: WorldState,
  role: RelationshipRole,
): Relationship | undefined {
  return Object.values(world.relationships).find((relationship) => relationship.role === role)
}

export function getRelationshipsByRole(
  world: WorldState,
  role: RelationshipRole,
): Relationship[] {
  return Object.values(world.relationships).filter((relationship) => relationship.role === role)
}

export function coachTrust(world: WorldState): number {
  return getRelationshipByRole(world, 'coach')?.trust ?? 50
}

export function adjustRelationship(
  relationship: Relationship | undefined,
  trustDelta = 0,
  tensionDelta = 0,
): void {
  if (!relationship) return
  relationship.trust = clamp(relationship.trust + trustDelta, 0, 100)
  relationship.tension = clamp(relationship.tension + tensionDelta, 0, 100)
}

export function adjustRoleTrust(
  world: WorldState,
  role: RelationshipRole,
  trustDelta: number,
  tensionDelta = 0,
): void {
  for (const relationship of getRelationshipsByRole(world, role)) {
    adjustRelationship(relationship, trustDelta, tensionDelta)
  }
}

export function relationshipLabel(role: RelationshipRole): string {
  switch (role) {
    case 'coach':
      return '主教练'
    case 'teammate':
      return '队友'
    case 'agent':
      return '经纪人'
    case 'family':
      return '家人'
    case 'media':
      return '媒体'
    case 'fan':
      return '球迷'
  }
}
