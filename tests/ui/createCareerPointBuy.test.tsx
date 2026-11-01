import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import type { GameStore } from '../../src/store'
import { useGameStore } from '../../src/store/gameStore'
import { CreateCareerScreen } from '../../src/ui/screens/CreateCareerScreen'
import { renderWithRouter } from './renderScreen'
import { resetUiStore } from './resetStore'

beforeEach(() => resetUiStore())
afterEach(() => {
  cleanup()
  resetUiStore()
})

function plus(key: string): HTMLButtonElement {
  return screen.getByRole('button', { name: `给${key}加 1 点` }) as HTMLButtonElement
}

function minus(key: string): HTMLButtonElement {
  return screen.getByRole('button', { name: `给${key}减 1 点` }) as HTMLButtonElement
}

function row(key: string): HTMLElement {
  const li = screen.getByText(key).closest('li')
  if (!li) throw new Error(`找不到 ${key} 的属性行`)
  return li as HTMLElement
}

function pointsLeft(): string {
  return screen.getByText(/\d+ 点可用/).textContent ?? ''
}

function clickTimes(button: HTMLButtonElement, times: number): void {
  for (let i = 0; i < times; i++) fireEvent.click(button)
}

function deltaLine(key: string): number {
  const line = within(row(key)).getByText(/\d+\.\d → \d+\.\d/)
  const [from, to] = (line.textContent ?? '').split(' → ').map(Number)
  return Number((to - from).toFixed(1))
}

describe('建号页属性点买', () => {
  it('预算随年龄与背景变化：17 岁青训 10 点，16 岁青训 7 点', () => {
    renderWithRouter(<CreateCareerScreen />)
    expect(pointsLeft()).toBe('10 点可用')
    fireEvent.change(screen.getByLabelText('年龄'), { target: { value: '16' } })
    expect(pointsLeft()).toBe('7 点可用')
  })

  it('点加号把该项预览抬高并扣掉可用点数', () => {
    renderWithRouter(<CreateCareerScreen />)
    clickTimes(plus('传球'), 2)
    expect(pointsLeft()).toBe('8 点可用')
    expect(within(row('传球')).getByText('+2')).toBeInTheDocument()
    expect(deltaLine('传球')).toBe(2)
  })

  it('单项封顶 4 点，第五次点击不再加点', () => {
    renderWithRouter(<CreateCareerScreen />)
    clickTimes(plus('射门'), 5)
    expect(within(row('射门')).getByText('+4')).toBeInTheDocument()
    expect(pointsLeft()).toBe('6 点可用')
    expect(deltaLine('射门')).toBe(4)
  })
})

describe('建号页属性点买的可见性与提交', () => {
  it('点减号把点退回去', () => {
    renderWithRouter(<CreateCareerScreen />)
    clickTimes(plus('盘带'), 3)
    expect(pointsLeft()).toBe('7 点可用')
    fireEvent.click(minus('盘带'))
    expect(pointsLeft()).toBe('8 点可用')
    expect(deltaLine('盘带')).toBe(2)
  })

  it('超出预算时说明原因并禁止签约', () => {
    renderWithRouter(<CreateCareerScreen />)
    clickTimes(plus('射门'), 4)
    clickTimes(plus('传球'), 4)
    clickTimes(plus('体能'), 4)
    expect(pointsLeft()).toBe('0 点可用')
    expect(screen.getByText('超出可分配点数 2 点')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /签下第一份合同/ })).toBeDisabled()
  })

  it('门将被藏在位置之后，选了门将才出现', () => {
    renderWithRouter(<CreateCareerScreen />)
    expect(screen.queryByRole('button', { name: '给门将加 1 点' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '门将' }))
    expect(screen.getByRole('button', { name: '给门将加 1 点' })).toBeEnabled()
  })

  it('点买卡同时给出潜力与综合分，让玩家看得见天花板', () => {
    renderWithRouter(<CreateCareerScreen />)
    expect(screen.getByText(/综合 \d+\.\d/)).toBeInTheDocument()
    expect(screen.getByText(/潜力 \d+\.\d/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '前锋' }))
    expect(within(row('射门')).getByRole('button', { name: '给射门加 1 点' })).toBeEnabled()
  })

  it('签约时把点买方案原样交给 createCareer', () => {
    const createCareer = vi.fn().mockResolvedValue(undefined)
    useGameStore.setState({ createCareer: createCareer as unknown as GameStore['createCareer'] })
    renderWithRouter(<CreateCareerScreen />)
    clickTimes(plus('射门'), 2)
    clickTimes(plus('传球'), 1)
    fireEvent.click(screen.getByRole('button', { name: /签下第一份合同/ }))
    expect(createCareer).toHaveBeenCalledTimes(1)
    const options = createCareer.mock.calls[0][0]
    expect(options.allocation).toEqual({ shooting: 2, passing: 1 })
    expect(options.age).toBe(17)
    expect(options.position).toBe('CM')
    expect(options.background).toBe('academy')
  })
})
