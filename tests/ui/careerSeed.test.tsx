import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import type { GameStore } from '../../src/store'
import { CreateCareerScreen } from '../../src/ui/screens/CreateCareerScreen'
import { useGameStore } from '../../src/store/gameStore'
import { renderWithRouter } from './renderScreen'
import { resetUiStore } from './resetStore'

/**
 * 种子框宣称「相同种子与相同选择会产生相同的比赛结果」，但取值域从没校验过：
 * 实测输入 21 位数字会被 JS 静默折成 1e+21，两个明显不同的种子生成同一个世界。
 */
function seedInput(): HTMLInputElement {
  return screen.getByRole('spinbutton', { name: '世界种子' }) as HTMLInputElement
}

function typeSeed(text: string): void {
  fireEvent.change(seedInput(), { target: { value: text } })
}

function submitButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: /签下第一份合同/ }) as HTMLButtonElement
}

function spyCreate(): Mock {
  const createCareer = vi.fn().mockResolvedValue(undefined)
  useGameStore.setState({ createCareer: createCareer as unknown as GameStore['createCareer'] })
  return createCareer
}

beforeEach(() => {
  resetUiStore()
  renderWithRouter(<CreateCareerScreen />)
})

afterEach(() => {
  cleanup()
  resetUiStore()
})

describe('世界种子的取值域', () => {
  it.each(['', '0', '-5', '12.5', '1000000', '1e21', '9999999999999999999999'])(
    '非法种子「%s」给出中文提示并拦住签约',
    (text) => {
      const create = spyCreate()
      typeSeed('424242')

      typeSeed(text)

      expect(screen.getByRole('alert')).toHaveTextContent('1–999999')
      expect(submitButton()).toBeDisabled()
      fireEvent.click(submitButton())
      expect(create.mock.calls).toHaveLength(0)
    },
  )

  it('合法整数原样留在框里，提示随之消失', () => {
    typeSeed('7')
    expect(seedInput().value).toBe('7')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    typeSeed('999999')
    expect(seedInput().value).toBe('999999')
    expect(submitButton()).toBeEnabled()
  })

  it('先非法再点「随机」，错误必须被清掉而不是挂着骗人', () => {
    typeSeed('1000000')
    expect(screen.getByRole('alert')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '随机' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(submitButton()).toBeEnabled()
  })

  it('交给引擎的种子就是框里那一个，而且在 1–999999 之内', () => {
    const create = spyCreate()

    fireEvent.click(screen.getByRole('button', { name: '随机' }))
    fireEvent.click(submitButton())

    const options = create.mock.calls[0]?.[0] as { seed: number }
    expect(String(options.seed)).toBe(seedInput().value)
    expect(Number.isInteger(options.seed)).toBe(true)
    expect(options.seed).toBeGreaterThanOrEqual(1)
    expect(options.seed).toBeLessThanOrEqual(999999)
  })

  it('打非法值时签约用的还是上一个合法种子，不会被静默改写', () => {
    const create = spyCreate()
    typeSeed('424242')

    typeSeed('1e21')
    fireEvent.click(submitButton())
    expect(create.mock.calls).toHaveLength(0)

    fireEvent.change(seedInput(), { target: { value: '424242' } })
    fireEvent.click(submitButton())

    const options = create.mock.calls[0]?.[0] as { seed: number }
    expect(options.seed).toBe(424242)
  })
})
