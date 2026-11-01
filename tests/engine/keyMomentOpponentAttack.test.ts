import { describe, expect, it } from 'vitest'
import {
  basisOf,
  chanceOf,
  contextFor,
  pick,
  softAll,
  toughAll,
  toughKeeperOnly,
  toughMarkerOnly,
} from '../fixtures/keyMomentRivals'
import { optionsFor } from '../../src/engine/data/keyMomentOptions'

describe('进攻类关键回合读对手属性', () => {
  it('对面门将越强，直接射门越难', () => {
    expect(chanceOf('bigChance', toughKeeperOnly, 'shoot')).toBeLessThan(
      chanceOf('bigChance', softAll, 'shoot'),
    )
    expect(basisOf('bigChance', toughKeeperOnly, 'shoot')).toContain('对手门将')
  })

  it('护球这类常量选项不看对手，两边给出同一个概率', () => {
    const soft = pick(optionsFor('bigChance', contextFor(softAll)), 'hold')
    const hard = pick(optionsFor('bigChance', contextFor(toughAll)), 'hold')

    expect(hard.successChance).toBe(soft.successChance)
    expect(hard.successBasisZh).toBe('稳定的护球选择')
  })

  it('对位后卫防守越硬，直塞越难', () => {
    expect(chanceOf('throughBall', toughMarkerOnly, 'thread')).toBeLessThan(
      chanceOf('throughBall', softAll, 'thread'),
    )
    expect(basisOf('throughBall', toughMarkerOnly, 'thread')).toContain('对手后卫')
  })

  it('单刀的三种收尾都被强门将压制', () => {
    for (const id of ['round', 'nearPost', 'chipKeeper']) {
      expect(chanceOf('oneOnOne', toughAll, id)).toBeLessThan(chanceOf('oneOnOne', softAll, id))
    }
  })
})
