import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { DangerZone } from '../../src/ui/screens/settings/DangerZone'
import { useGameStore } from '../../src/store/gameStore'
import { renderWithRouter } from './renderScreen'
import { resetUiStore } from './resetStore'

/**
 * 职责：钉住设置页「删除当前存档」也走应用内确认框，而不是系统 confirm 的英文按钮。
 * 边界：只渲染 DangerZone 并驱动真实按钮；删除动作打桩在 store 上，不碰 IndexedDB。
 * 依赖：src/ui/screens/settings/DangerZone.tsx 与 src/store 的 removeSave。
 */
afterEach(() => {
  cleanup()
  resetUiStore()
  vi.unstubAllGlobals()
})

function renderZone(onRemoved = vi.fn(), saveId: string | null = 'save:danger') {
  useGameStore.setState({ saveId, hydrated: true, saves: [] })
  return renderWithRouter(<DangerZone saveId={saveId} onRemoved={onRemoved} />)
}

describe('设置页危险操作', () => {
  it('回归: 删除当前存档用系统 confirm 确认，按钮写着英文 CANCEL 与 OK', () => {
    const confirmSpy = vi.fn(() => true)
    vi.stubGlobal('confirm', confirmSpy)
    renderZone()

    fireEvent.click(screen.getByRole('button', { name: /删除当前存档/ }))

    expect(confirmSpy).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByText('CANCEL')).toBeNull()
  })

  it('确认框里点「取消」不删档，弹窗关掉', () => {
    const removeSave = vi.fn(async () => true)
    useGameStore.setState({ removeSave })
    renderZone()

    fireEvent.click(screen.getByRole('button', { name: /删除当前存档/ }))
    fireEvent.click(screen.getByRole('button', { name: '取消' }))

    expect(removeSave).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('确认框里点「删除」才删当前存档，并回调跳转', () => {
    const removeSave = vi.fn(async () => true)
    const onRemoved = vi.fn()
    useGameStore.setState({ removeSave })
    renderZone(onRemoved)

    fireEvent.click(screen.getByRole('button', { name: /删除当前存档/ }))
    fireEvent.click(screen.getByRole('button', { name: '删除' }))

    expect(removeSave).toHaveBeenCalledWith('save:danger')
  })

  it('没有当前存档时按钮不弹确认框', () => {
    renderZone(vi.fn(), null)

    fireEvent.click(screen.getByRole('button', { name: /删除当前存档/ }))

    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
