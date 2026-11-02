import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { ATTR_KEYS } from '../../src/domain'
import type { KeyMoment, KeyMomentKind, KeyMomentOption, Player, PlayerMove } from '../../src/domain'
import { optionsFor } from '../../src/engine/data/keyMomentOptions'
import type { OpponentPair } from '../../src/engine/data/scoreChance'
import { KeyMomentCard } from '../../src/ui/screens/matchday/KeyMomentCard'
import { strongPlayer } from '../fixtures/keyMomentKinds'
import { rival } from '../fixtures/keyMomentRivals'

/** 门将站位与后卫防守都拉到 88 上下，让对手段真的出现在依据里。 */
const FOES: OpponentPair = {
  keeper: rival({ goalkeeping: 88, pace: 80 }),
  marker: rival({ defending: 88, pace: 78 }),
  shooter: rival({ shooting: 70 }),
}

function holder(level: number): Player {
  const player = strongPlayer()
  for (const key of ATTR_KEYS) player.attributes[key] = 60
  const moves: PlayerMove[] = level === 0 ? [] : [{ moveId: 'mv_rainbow', level, progress: 0 }]
  return { ...player, moves }
}

function momentOf(kind: KeyMomentKind, player: Player): KeyMoment {
  const options: KeyMomentOption[] = optionsFor(kind, { player, isHome: true, opponents: FOES })
  return {
    id: 'km:badges',
    kind,
    minute: 63,
    titleZh: '单刀机会',
    promptZh: '只剩你和门将。',
    defaultOptionId: options[0].id,
    roll: 0.5,
    triggerZh: '中场直塞打穿防线',
    options,
  }
}

function openCard(kind: KeyMomentKind, player: Player) {
  render(
    <KeyMomentCard
      active={momentOf(kind, player)}
      acting={false}
      onChoose={vi.fn()}
      onSkip={vi.fn()}
    />,
  )
}

afterEach(() => cleanup())

describe('关键回合选项的绝技徽标', () => {
  it('练成的绝技带着级数与加成单独立一块', () => {
    openCard('oneOnOne', holder(2))

    const row = screen.getByRole('button', { name: /晃过门将/ })
    expect(within(row).getByText('彩虹过人 Ⅱ +6.6%')).toBeInTheDocument()
    expect(within(row).getByText('绝技')).toBeInTheDocument()
  })

  it('对位压制写明是谁的哪一项在压这一招', () => {
    openCard('oneOnOne', holder(2))

    const row = screen.getByRole('button', { name: /晃过门将/ })
    expect(within(row).getByText('压制')).toBeInTheDocument()
    expect(within(row).getByText('对手门将 88 -12.3%')).toBeInTheDocument()
    expect(within(row).getByText('对手后卫 防守 88 -8.8%')).toBeInTheDocument()
  })

  it('没学会绝技时不给徽标，但对手照样压人', () => {
    openCard('oneOnOne', holder(0))

    const row = screen.getByRole('button', { name: /晃过门将/ })
    expect(within(row).queryByText('绝技')).toBeNull()
    expect(within(row).getByText('对手门将 88 -12.3%')).toBeInTheDocument()
  })

  it('不吃属性的常量选项既无徽标也无压制', () => {
    openCard('bigChance', holder(2))

    const row = screen.getByRole('button', { name: /护球等待支援/ })
    expect(within(row).queryByText('绝技')).toBeNull()
    expect(within(row).queryByText('压制')).toBeNull()
    expect(within(row).getByText(/成功率 \d+%/)).toBeInTheDocument()
  })

  it('自己的属性项仍留在依据行里', () => {
    openCard('oneOnOne', holder(2))

    const row = screen.getByRole('button', { name: /晃过门将/ })
    expect(within(row).getByText('盘带 60 +18%')).toBeInTheDocument()
    expect(within(row).getByText('技术 60 +12%')).toBeInTheDocument()
  })
})
