import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { styleFit } from '../../src/domain'
import { PlayerStyleCard } from '../../src/ui/screens/team/PlayerStyleCard'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

afterEach(cleanup)

/** 取真实世界里的一对球员/俱乐部，契合度由 domain.styleFit 现算，写死数字会在下次改风格表时假绿。 */
function renderCard() {
  const world = generateWorld(testOptions({ seed: 2026 }), TEST_NOW)
  const player = world.players[world.playerId]
  const club = world.clubs[world.clubId]
  render(<PlayerStyleCard player={player} club={club} />)
  return { row: screen.getByText('契合度').parentElement as HTMLElement, percent: Math.round(styleFit(player, club.style) * 100) }
}

describe('打法匹配卡的契合度读数', () => {
  it('数值与百分比是同一个数，只出现一次', () => {
    const { row, percent } = renderCard()

    expect(row.textContent).toBe(`契合度${percent}%`)
    expect(row.textContent).not.toContain(`${percent}${percent}`)
  })

  it('这一行只有一个数字，不会被读成「6161」', () => {
    const { row } = renderCard()

    expect((row.textContent ?? '').match(/\d+/g)).toHaveLength(1)
  })
})
