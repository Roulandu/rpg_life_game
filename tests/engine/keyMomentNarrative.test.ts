import { describe, expect, it } from 'vitest'
import type { KeyMoment, KeyMomentKind } from '../../src/domain/types'
import { optionsFor } from '../../src/engine/data/keyMomentOptions'
import { outcomeText } from '../../src/engine/keyMomentNarrative'
import { KINDS, strongPlayer } from '../fixtures/keyMomentKinds'

const player = strongPlayer()

function momentFor(kind: KeyMomentKind): KeyMoment {
  return {
    id: `km:${kind}`,
    minute: 30,
    kind,
    titleZh: kind,
    promptZh: kind,
    options: optionsFor(kind, { player, isHome: true }),
    defaultOptionId: 'default',
    roll: 0.5,
  }
}

describe('key moment narrative', () => {
  it('12 类成功与失败叙事都非空', () => {
    for (const kind of KINDS) {
      const moment = momentFor(kind)
      for (const option of moment.options) {
        expect(outcomeText(moment, option, true, '测试球员').length).toBeGreaterThan(0)
        expect(outcomeText(moment, option, false, '测试球员').length).toBeGreaterThan(0)
      }
    }
  })
})
