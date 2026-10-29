import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useGameStore } from '../../src/store/gameStore'
import { useMomentActions } from '../../src/ui/screens/matchday/useMomentActions'

describe('useMomentActions', () => {
  it('resets the acting lock even when resolving a moment fails', async () => {
    useGameStore.setState({
      resolveKeyMoment: vi.fn(async () => {
        throw new Error('写入失败')
      }),
    })
    const { result } = renderHook(() => useMomentActions())

    await act(async () => {
      await result.current.choose('moment:1', 'safe')
    })

    expect(result.current.acting).toBe(false)
  })
})
