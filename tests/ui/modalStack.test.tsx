import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Modal } from '../../src/ui'
import { closeTopModal } from '../../src/ui/components/Modal'

/**
 * 职责：把「系统返回键先关弹窗」做成一个可测的栈语义：后进先出、不可关的不进栈、关完就交还。
 * 边界：只驱动 Modal 组件本身，不接 Capacitor；返回键端由 tests/platform/backButton.test.ts 覆盖。
 * 依赖：src/ui/components/Modal.tsx 的模块级弹窗栈。
 */
afterEach(() => {
  cleanup()
})

describe('弹窗什么时候算进栈', () => {
  it('回归: 弹窗开着时 closeTopModal 关不掉它，返回键于是退出整个应用', () => {
    const close = vi.fn()
    render(
      <Modal open title="安排本周" onClose={close}>
        <p>选一个训练重点</p>
      </Modal>,
    )

    expect(closeTopModal()).toBe(true)
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('dismissible 为假的弹窗不进栈，返回键不该把它当成已处理', () => {
    const close = vi.fn()
    render(
      <Modal open title="赛季结算" onClose={close} dismissible={false}>
        <p>不可跳过</p>
      </Modal>,
    )

    expect(closeTopModal()).toBe(false)
    expect(close).not.toHaveBeenCalled()
  })

  it('没打开的弹窗不进栈', () => {
    const close = vi.fn()
    render(
      <Modal open={false} title="没开" onClose={close}>
        <p>隐身</p>
      </Modal>,
    )

    expect(closeTopModal()).toBe(false)
  })

  it('弹窗卸载后从栈里摘掉，不会留下悬空的关闭回调', () => {
    const close = vi.fn()
    const view = render(
      <Modal open title="临时" onClose={close}>
        <p>内容</p>
      </Modal>,
    )

    view.unmount()

    expect(closeTopModal()).toBe(false)
    expect(close).not.toHaveBeenCalled()
  })
})

describe('弹窗栈的层级与关闭路径', () => {
  it('叠着的弹窗按后进先出关，先关最上面那层', () => {
    const under = vi.fn()
    const over = vi.fn()
    render(
      <>
        <Modal open title="下层" onClose={under}>
          <p>下</p>
        </Modal>
        <Modal open title="上层" onClose={over}>
          <p>上</p>
        </Modal>
      </>,
    )

    expect(closeTopModal()).toBe(true)
    expect(over).toHaveBeenCalledTimes(1)
    expect(under).not.toHaveBeenCalled()
    expect(closeTopModal()).toBe(true)
    expect(under).toHaveBeenCalledTimes(1)
    expect(closeTopModal()).toBe(false)
  })

  it('Escape 关闭走的是同一个 onClose 回调，不额外造第二套关闭路径', () => {
    const close = vi.fn()
    render(
      <Modal open title="唯一" onClose={close}>
        <p>内容</p>
      </Modal>,
    )

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(close).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
