import { describe, expect, it } from 'vitest'
import { buildPitchFrame, positionGroup } from '../../src/domain'
import type { PitchPlayer } from '../../src/domain'
import { pitchWorld } from '../fixtures/pitchWorld'

const { world, lineups } = pitchWorld()
const homeForward = lineups.home.find((player) => positionGroup(player.position) === 'FWD')
const awayForward = lineups.away.find((player) => positionGroup(player.position) === 'FWD')

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

function averageX(players: PitchPlayer[]): number {
  return players.reduce((total, player) => total + player.x, 0) / players.length
}

function groupX(players: PitchPlayer[], group: 'GK' | 'DEF' | 'MID' | 'FWD'): number {
  return averageX(players.filter((player) => positionGroup(player.position) === group))
}

describe('buildPitchFrame shape', () => {
  it('双方各 11 名球员坐标都在边界内且拥有姓名与号码', () => {
    const value = frame()

    expect(value.home).toHaveLength(11)
    expect(value.away).toHaveLength(11)
    for (const player of [...value.home, ...value.away]) {
      expect(player.x).toBeGreaterThanOrEqual(0)
      expect(player.x).toBeLessThanOrEqual(1)
      expect(player.y).toBeGreaterThanOrEqual(0)
      expect(player.y).toBeLessThanOrEqual(1)
      expect(player.name.length).toBeGreaterThan(0)
      expect(player.number).toBeGreaterThan(0)
    }
  })

  it('控球方压上越过中线，防守方回撤并由最近球员逼抢', () => {
    const value = frame({ possession: 'home', ballX: 0.9, carrierId: homeForward!.id })
    const homeForwards = value.home.filter((player) => positionGroup(player.position) === 'FWD')
    const awayPlayers = value.away
    const closest = [...awayPlayers].sort(
      (a, b) => (a.x - value.ball.x) ** 2 + (a.y - value.ball.y) ** 2 -
        ((b.x - value.ball.x) ** 2 + (b.y - value.ball.y) ** 2),
    )[0]!

    expect(homeForwards.some((player) => player.x > 0.5)).toBe(true)
    expect(awayPlayers.filter((player) => positionGroup(player.position) === 'DEF').every((player) => player.x > value.ball.x)).toBe(true)
    const distance = Math.hypot(closest.x - value.ball.x, closest.y - value.ball.y)
    expect(distance).toBeLessThanOrEqual(0.09)
  })

  it('球贴在指定持球人脚下，且只有控球方一人持球', () => {
    const value = frame({ possession: 'away', ballX: 0.3, carrierId: awayForward!.id })
    const carrier = value.away.find((player) => player.id === awayForward!.id)!

    expect(value.carrierId).toBe(awayForward!.id)
    expect(carrier.hasBall).toBe(true)
    expect(value.away.filter((player) => player.hasBall)).toHaveLength(1)
    expect(value.home.some((player) => player.hasBall)).toBe(false)
    expect(Math.hypot(carrier.x - value.ball.x, carrier.y - value.ball.y)).toBeLessThan(0.02)
  })

  it('门将贴近本方球门，阵型从后到前沿进攻方向递增', () => {
    const value = frame({ possession: 'home', ballX: 0.75, carrierId: homeForward!.id })

    expect(groupX(value.home, 'GK')).toBeLessThan(0.08)
    expect(groupX(value.away, 'GK')).toBeGreaterThan(0.92)
    expect(groupX(value.home, 'GK')).toBeLessThan(groupX(value.home, 'DEF'))
    expect(groupX(value.home, 'DEF')).toBeLessThan(groupX(value.home, 'MID'))
    expect(groupX(value.home, 'MID')).toBeLessThan(groupX(value.home, 'FWD'))
    expect(groupX(value.away, 'FWD')).toBeLessThan(groupX(value.away, 'MID'))
    expect(groupX(value.away, 'MID')).toBeLessThan(groupX(value.away, 'DEF'))
    expect(groupX(value.away, 'DEF')).toBeLessThan(groupX(value.away, 'GK'))
  })
})

describe('buildPitchFrame motion', () => {
  it('轨迹使用真实历史球位并只保留最近四帧', () => {
    const history = Array.from({ length: 6 }, (_, index) => ({
      minute: index + 1,
      ballX: 0.3 + index * 0.08,
      possession: index % 2 === 0 ? ('home' as const) : ('away' as const),
    }))
    const value = frame({ history, ballX: 0.82, carrierId: homeForward!.id })

    expect(value.trails).toHaveLength(4)
    expect(value.trails.map((trail) => trail.x)).toEqual(history.slice(-4).map((point) => point.ballX))
  })

  it('传球线从上一球位连到当前持球人脚下', () => {
    const value = frame({
      history: [{ minute: 9, ballX: 0.42, possession: 'home' }],
      ballX: 0.78,
      carrierId: homeForward!.id,
    })

    expect(value.passPath.length).toBeGreaterThanOrEqual(2)
    expect(value.passPath[0]!.x).toBeCloseTo(0.42, 5)
    expect(value.passPath.at(-1)).toEqual(value.ball)
  })

  it('历史包含当前分钟时传球线从上一分钟球位出发', () => {
    const value = frame({
      minute: 10,
      history: [
        { minute: 9, ballX: 0.42, possession: 'home' },
        { minute: 10, ballX: 0.78, possession: 'home' },
      ],
      ballX: 0.78,
      carrierId: homeForward!.id,
    })

    expect(value.passPath[0]!.x).toBeCloseTo(0.42, 5)
    expect(value.passPath.at(-1)).toEqual(value.ball)
  })

  it('同一 seed、场次与分钟生成相同坐标，不同分钟产生跑位变化', () => {
    expect(frame()).toEqual(frame())
    const later = frame({ minute: 11 })
    const moved = later.home.some(
      (player, index) => player.x !== frame().home[index]!.x || player.y !== frame().home[index]!.y,
    )
    expect(moved).toBe(true)
  })

  it('缺少 carrierId 时按控球方确定性选择持球人并透传进球方', () => {
    const first = frame({ possession: 'away', ballX: 0.25, goalSide: 'away' })
    const second = frame({ possession: 'away', ballX: 0.25, goalSide: 'away' })
    const carrier = first.away.find((player) => player.id === first.carrierId)

    expect(carrier?.hasBall).toBe(true)
    expect(first.carrierId).toBeTruthy()
    expect(second.carrierId).toBe(first.carrierId)
    expect(first.goalSide).toBe('away')
  })
})
