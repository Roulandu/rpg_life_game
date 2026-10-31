import { describe, expect, it } from 'vitest'
import { buildPitchFrame, computeClubStrength } from '../../src/domain'
import { buildBeats } from '../../src/engine/matchBeats'
import { pitchWorld } from '../fixtures/pitchWorld'

const { world, homeClub, awayClub, lineups } = pitchWorld()
const homeStrength = computeClubStrength(homeClub, world.players)
const awayStrength = computeClubStrength(awayClub, world.players)

const input = {
  seed: world.seed,
  fixtureId: 'fixture:test:beats',
  minute: 12,
  homeStrength,
  awayStrength,
  homeName: homeClub.nameZh,
  awayName: awayClub.nameZh,
  lineups,
}

describe('buildBeats', () => {
  it('对相同输入返回相同球权、球位、事件与统计', () => {
    expect(buildBeats(input)).toEqual(buildBeats(input))
  })

  it('为控球方累计一分钟控球，并给出球位', () => {
    const result = buildBeats(input)
    const side = result.possession
    expect(result.stats[side].possession).toBe(1)
    expect(result.stats[side === 'home' ? 'away' : 'home'].possession ?? 0).toBe(0)
    expect(result.ballX).toBeGreaterThanOrEqual(0)
    expect(result.ballX).toBeLessThanOrEqual(1)
  })

  it('事件带攻防双方标记，控球方射门时计入统计', () => {
    const found = Array.from({ length: 60 }, (_, index) =>
      buildBeats({ ...input, minute: index + 1 }),
    ).find((result) => result.events.length > 0)

    expect(found).toBeDefined()
    for (const event of found!.events) {
      expect(['home', 'away']).toContain(event.side)
      expect(event.text.length).toBeGreaterThan(0)
    }
    const shot = found!.events.find((event) => event.type === 'shot')
    if (shot) {
      const stats = found!.stats[shot.side!]
      expect(stats.shots ?? 0).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('pitch integration', () => {
  it('同一分钟的球权与球位可生成合法球场帧', () => {
    const beats = buildBeats(input)
    const frame = buildPitchFrame({
      seed: world.seed,
      fixtureId: input.fixtureId,
      minute: 12,
      lineups: input.lineups,
      possession: beats.possession,
      ballX: beats.ballX,
    })
    expect(frame.home).toHaveLength(11)
    expect(frame.away).toHaveLength(11)
  })
})
