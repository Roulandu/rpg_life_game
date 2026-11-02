import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MorePrimaryColumn } from '../../src/ui/screens/more/MorePrimaryColumn'
import { useGameStore } from '../../src/store/gameStore'
import { movesWorld } from './movesView'
import { resetUiStore } from './resetStore'

afterEach(() => {
  cleanup()
  resetUiStore()
})

describe('绝技入口', () => {
  it('更多页给出绝技入口', () => {
    const world = movesWorld()
    useGameStore.setState({ world, hydrated: true, saves: [] })
    render(
      <MemoryRouter initialEntries={['/more']}>
        <MorePrimaryColumn world={world} />
      </MemoryRouter>,
    )

    expect(screen.getByText('绝技')).toBeInTheDocument()
  })
})
