import { describe, expect, it } from 'vitest'
import { buildPitchFrame } from '../../src/domain'
import { pitchWorld } from '../fixtures/pitchWorld'

const { world, lineups } = pitchWorld()

function frame(input: Partial<Parameters<typeof buildPitchFrame>[0]> = {}) {
  return buildPitchFrame({
    seed: world.seed,
    fixtureId: 'fixture:test:1',
    minute: 10,
    lineups,
    possession: 'home',
    ballX: 0.6,
    history: [],
    ...input,
  })
}

describe('buildPitchFrame', () => {
  it('双方各 11 名球员坐标都在边界内且分居两半场', () => {
    const frameValue = frame()

    expect(frameValue.home).toHaveLength(11)
    expect(frameValue.away).toHaveLength(11)
    for (const player of [...frameValue.home, ...frameValue.away]) {
      expect(player.x).toBeGreaterThanOrEqual(0)
      expect(player.x).toBeLessThanOrEqual(1)
      expect(player.y).toBeGreaterThanOrEqual(0)
      expect(player.y).toBeLessThanOrEqual(1)
    }
    expect(frameValue.home.every((player) => player.x < 0.5)).toBe(true)
    expect(frameValue.away.every((player) => player.x > 0.5)).toBe(true)
    expect(frameValue.home.every((player) => player.name.length > 0 && player.number > 0)).toBe(true)
  })

  it('同一 seed、场次与分钟生成相同坐标，不同分钟产生跑位变化', () => {
    expect(frame()).toEqual(frame())
    const later = frame({ minute: 11 })
    const moved = later.home.some((player, index) => player.x !== frame().home[index]!.x || player.y !== frame().home[index]!.y)
    expect(moved).toBe(true)
  })

  it('球权决定球所在半场，轨迹只保留最近四帧', () => {
    const awayAttack = frame({ possession: 'away', ballX: 0.32 })
    expect(awayAttack.ball.x).toBeLessThan(0.5)
    expect(awayAttack.possession).toBe('away')

    const history = Array.from({ length: 6 }, (_, index) => ({ minute: index + 1, ballX: 0.4 + index * 0.05 }))
    expect(frame({ history }).trails).toHaveLength(4)
  })

  it('控球方距离足球最近的球员获得球权标记', () => {
    const value = frame({ possession: 'away', ballX: 0.7 })
    expect(value.away.filter((player) => player.hasBall)).toHaveLength(1)
    expect(value.home.some((player) => player.hasBall)).toBe(false)
  })
})
