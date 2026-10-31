import { describe, expect, it } from 'vitest'
import type { KeyMomentOption } from '../../src/domain'
import { generateKeyMoments } from '../../src/engine/keyMomentGen'
import { createRng } from '../../src/lib'
import { playToKeyMoments, readyWorld } from '../fixtures/matchday'

describe('key moment generation', () => {
  it('每场生成 5–7 个分钟递增的关键回合', () => {
    const { report } = playToKeyMoments()
    const moments = report.keyMoments ?? []

    expect(moments.length).toBeGreaterThanOrEqual(5)
    expect(moments.length).toBeLessThanOrEqual(7)
    for (let index = 1; index < moments.length; index += 1) {
      expect(moments[index]!.minute).toBeGreaterThan(moments[index - 1]!.minute)
    }
    expect(moments.every((moment) => moment.minute > 0 && moment.minute <= 90)).toBe(true)
    expect(moments.every((moment) => moment.options.length === 5)).toBe(true)
    expect(moments.every((moment) => (moment.triggerZh ?? '').length > 0)).toBe(true)
  })

  it('默认选项是成功率最高的稳妥选项', () => {
    const { report } = playToKeyMoments()
    for (const moment of report.keyMoments ?? []) {
      const chances = moment.options.map((option) => option.successChance)
      const safe = moment.options.find((option) => option.id === moment.defaultOptionId)
      expect(safe?.successChance).toBe(Math.max(...chances))
    }
  })

  it('替补窗口按出场分钟缩放数量并限制在登场之后', () => {
    const world = readyWorld()
    const moments = generateKeyMoments(
      world.players[world.playerId]!,
      createRng(world.seed, 'sub-window'),
      20,
      true,
      70,
    )

    expect(moments.length).toBeLessThanOrEqual(3)
    expect(moments.every((moment) => moment.minute >= 72 && moment.minute <= 89)).toBe(true)
  })

  it('同一 seed 生成相同回合与选项', () => {
    const world = readyWorld()
    const player = world.players[world.playerId]!
    const first = generateKeyMoments(player, createRng(7, 'km'), 90, true)
    const second = generateKeyMoments(player, createRng(7, 'km'), 90, true)
    expect(first.map((moment) => moment.id)).toEqual(second.map((moment) => moment.id))
    expect(first.map((moment) => moment.kind)).toEqual(second.map((moment) => moment.kind))
    expect(first[0]!.options.map((option: KeyMomentOption) => option.id)).toEqual(
      second[0]!.options.map((option: KeyMomentOption) => option.id),
    )
  })
})
