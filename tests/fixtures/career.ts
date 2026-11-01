import type { CareerCreateOptions, WorldState } from '../../src/domain/types'

export const TEST_NOW = '2026-08-01T00:00:00.000Z'

export function testOptions(overrides: Partial<CareerCreateOptions> = {}): CareerCreateOptions {
  return {
    name: '测试球员',
    nationality: '中国',
    age: 17,
    position: 'CM',
    archetype: 'technician',
    background: 'academy',
    clubId: 'club:ENG:2:04',
    seed: 424242,
    ...overrides,
  }
}

/** 现代存档带中文名；回退成老存档形状时要把它们全部抹掉。 */
export function stripNameZh(world: WorldState): WorldState {
  const legacy = world as unknown as Record<string, unknown>
  for (const container of ['players', 'relationships'] as const) {
    for (const item of Object.values(legacy[container] as Array<Record<string, unknown>>)) {
      delete item.nameZh
    }
  }
  for (const club of Object.values(world.clubs)) {
    delete (club.coach as unknown as Record<string, unknown>).nameZh
  }
  for (const fixture of Object.values(world.fixtures)) {
    for (const lineup of [fixture.report?.lineups?.home, fixture.report?.lineups?.away]) {
      for (const entry of lineup ?? []) delete (entry as unknown as Record<string, unknown>).nameZh
    }
  }
  return world
}
