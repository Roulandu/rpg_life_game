import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { InboxScreen } from '../../src/ui/screens/InboxScreen'
import { ChatComposer } from '../../src/ui/screens/inbox/ChatComposer'
import { useGameStore } from '../../src/store/gameStore'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'
import { renderWithRouter } from './renderScreen'
import { resetUiStore } from './resetStore'

function renderInbox() {
  return renderWithRouter(<InboxScreen />)
}

afterEach(() => {
  cleanup()
  resetUiStore()
})

describe('inbox screen', () => {
  it('shows the empty events tab by default', () => {
    useGameStore.setState({ world: generateWorld(testOptions(), TEST_NOW), hydrated: true })
    renderInbox()

    expect(screen.getByText('收件箱')).toBeInTheDocument()
    expect(screen.getByText('没有待处理的事件')).toBeInTheDocument()
  })

  it('shows the disabled chat gate when AI is off', () => {
    useGameStore.setState({ world: generateWorld(testOptions(), TEST_NOW), hydrated: true })
    renderInbox()

    fireEvent.click(screen.getByRole('button', { name: '对话' }))

    expect(screen.getByText('AI 对话未启用。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '去设置' })).toBeInTheDocument()
  })

  it('shows the empty news tab', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    world.news = []
    useGameStore.setState({ world, hydrated: true })
    renderInbox()

    fireEvent.click(screen.getByRole('button', { name: '新闻' }))

    expect(screen.getByText('还没有新闻')).toBeInTheDocument()
  })

  it('shows the composer when AI is enabled with a key', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    world.settings.aiMode = 'llm'
    useGameStore.setState({ world, hydrated: true, aiKeyReady: true })
    renderInbox()

    fireEvent.click(screen.getByRole('button', { name: '对话' }))

    expect(screen.getByLabelText('对 GM 说')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '发送' })).toBeDisabled()
  })

  it('opens the chat tab directly from a query parameter', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    world.settings.aiMode = 'llm'
    useGameStore.setState({ world, hydrated: true, aiKeyReady: true })
    renderWithRouter(<InboxScreen />, { initialEntries: ['/inbox?tab=chat'] })

    expect(screen.getByLabelText('对 GM 说')).toBeInTheDocument()
  })

  it('locks the chat viewport and scrolls messages above the composer', () => {
    const world = generateWorld(testOptions(), TEST_NOW)
    world.settings.aiMode = 'llm'
    useGameStore.setState({ world, hydrated: true, aiKeyReady: true })
    const { container } = renderWithRouter(<InboxScreen />, { initialEntries: ['/inbox?tab=chat'] })

    const page = container.firstElementChild as HTMLElement
    const scroll = screen.getByTestId('chat-scroll')
    const composer = screen.getByLabelText('对 GM 说')

    expect(page.className).toContain('md:h-[calc(100svh_-_var(--bottom-nav-h))]')
    expect(page.className).toContain('md:mb-[calc(var(--bottom-nav-h)_-_6rem)]')
    expect(page.className).toContain('lg:mb-0')
    expect(scroll.className).toContain('md:overflow-y-auto')
    expect(scroll.contains(composer)).toBe(false)
    expect(composer.closest('.card')?.className).toContain('md:shrink-0')
  })
})

describe('chat composer', () => {
  it('does not send when enter confirms an input method composition', () => {
    const onSend = vi.fn()
    render(<ChatComposer aiBusy={false} onSend={onSend} />)
    const input = screen.getByLabelText('对 GM 说')
    fireEvent.change(input, { target: { value: '你好' } })

    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })

    expect(onSend).not.toHaveBeenCalled()

    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSend).toHaveBeenCalledWith('你好')
  })
})
