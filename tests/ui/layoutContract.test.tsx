import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Route, Routes } from 'react-router-dom'
import {
  CreateCareerScreen,
  DashboardScreen,
  InboxScreen,
  MoveDetailScreen,
  MovesScreen,
  ScheduleScreen,
  TeamPlayerScreen,
  TeamScreen,
} from '../../src/ui'
import { useGameStore } from '../../src/store/gameStore'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'
import {
  loadWorld,
  minHeightPx,
  tokensIn,
  tooWideTokens,
  touchTargets,
} from './layoutHarness'
import { renderWithRouter } from './renderScreen'
import { resetUiStore } from './resetStore'

/** 平静日的今天区没有可点目标，所以造一条本周待处理事件，把「去处理事件」按钮逼出来。 */
function loadWorldWithOpenEvent() {
  const world = generateWorld(testOptions(), TEST_NOW)
  world.day = 1
  const id = `event:${world.season}:${world.week}:1:layout-contract`
  world.events[id] = {
    id,
    templateId: 'test:layout',
    title: '布局契约用的待处理事件',
    body: '这条事件只为了让今天区出现处理入口。',
    season: world.season,
    week: world.week,
    createdAtWeek: world.week,
    expiresWeek: world.week + 1,
    status: 'open',
    choices: [{ id: 'c1', label: '好的', effects: [] }],
    source: 'template',
  }
  useGameStore.setState({ world, hydrated: true, saves: [] })
  return world
}

afterEach(() => {
  cleanup()
  resetUiStore()
})

describe('触控目标契约', () => {
  it('按钮组件类自带 44px 最小高度，页面可以只写 btn-*', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')
    expect(css).toMatch(/\.btn-primary,\s*\.btn-secondary,\s*\.btn-ghost\s*\{[^}]*min-h-11/)
  })

  it('主页每个区块里的可点目标在手机上都不小于 44px', () => {
    loadWorldWithOpenEvent()
    const { container } = renderWithRouter(<DashboardScreen />)

    const regions = Array.from(container.querySelectorAll<HTMLElement>('[data-dashboard-block]'))
    expect(regions.length).toBeGreaterThanOrEqual(6)

    const tooSmall = regions
      .flatMap((region) => touchTargets(region))
      .filter((target) => minHeightPx(target.className) < 44)
      .map((target) => `${target.tagName} ${target.textContent?.trim()} @ ${target.className}`)
    expect(tooSmall).toEqual([])
    expect(touchTargets(container).length).toBeGreaterThan(6)
  })

  it('赛程页与收件箱页的移动端 tab 也是 44px 触控目标', () => {
    loadWorld()

    const schedule = renderWithRouter(<ScheduleScreen />, { initialEntries: ['/schedule'] })
    const scheduleTabs = touchTargets(schedule.container).filter((el) => /^(赛程|积分榜)$/.test((el.textContent || '').trim()))
    expect(scheduleTabs).toHaveLength(2)
    for (const tab of scheduleTabs) {
      expect(minHeightPx(tab.className)).toBeGreaterThanOrEqual(44)
    }
    cleanup()

    const inbox = renderWithRouter(<InboxScreen />, { initialEntries: ['/inbox'] })
    const inboxTabs = touchTargets(inbox.container).filter((el) => /^(事件|对话|新闻)$/.test((el.textContent || '').trim()))
    expect(inboxTabs).toHaveLength(3)
    for (const tab of inboxTabs) {
      expect(minHeightPx(tab.className)).toBeGreaterThanOrEqual(44)
    }
  })

  it('队伍页名单行与详情页返回链接都是 44px 触控目标', () => {
    const world = loadWorld()
    const teammateId = world.clubs[world.clubId].squadIds.find((id) => id !== world.playerId) as string

    const list = renderWithRouter(<TeamScreen />, { initialEntries: ['/team'] })
    for (const row of touchTargets(list.container)) {
      expect(minHeightPx(row.className)).toBeGreaterThanOrEqual(44)
    }
    cleanup()

    const detail = renderWithRouter(
      <Routes>
        <Route path="/team/:playerId" element={<TeamPlayerScreen />} />
      </Routes>,
      { initialEntries: [`/team/${teammateId}`] },
    )
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    for (const row of touchTargets(detail.container)) {
      expect(minHeightPx(row.className)).toBeGreaterThanOrEqual(44)
    }
  })
})

describe('建号页手机契约', () => {
  it('属性点买的加减按钮是 44px 见方的触控目标', () => {
    const { container } = renderWithRouter(<CreateCareerScreen />, { initialEntries: ['/create'] })
    const steppers = touchTargets(container).filter((el) =>
      /^给.+(加|减) 1 点$/.test(el.getAttribute('aria-label') ?? ''),
    )
    expect(steppers).toHaveLength(18)

    for (const el of steppers) {
      expect(minHeightPx(el.className)).toBeGreaterThanOrEqual(44)
      const wide = /(?:^|\s)min-w-(\d+)(?:\s|$)/.exec(el.className)
      expect(Number(wide?.[1] ?? 0) * 4).toBeGreaterThanOrEqual(44)
    }
  })

  it('页面里没有超过手机安全宽度的固定像素宽度', () => {
    const { container } = renderWithRouter(<CreateCareerScreen />, { initialEntries: ['/create'] })
    const tooWide = tooWideTokens(container)
    expect(tooWide).toEqual([])
  })
})

describe('手机宽度契约', () => {
  it('队伍页与详情页手机端占满宽度、桌面收到 760px 阅读宽度', () => {
    loadWorld()

    const list = renderWithRouter(<TeamScreen />, { initialEntries: ['/team'] })
    const listRoot = list.container.firstElementChild as HTMLElement
    expect(listRoot.className).toContain('page-pad')
    expect(listRoot.className).toContain('sm:mx-auto')
    expect(listRoot.className).toContain('sm:max-w-[760px]')
    expect(listRoot.className).not.toMatch(/(?:^|\s)max-w-\[\d+px\]/)
    cleanup()

    const world = useGameStore.getState().world
    const userId = world ? world.playerId : ''
    const detail = renderWithRouter(
      <Routes>
        <Route path="/team/:playerId" element={<TeamPlayerScreen />} />
      </Routes>,
      { initialEntries: [`/team/${userId}`] },
    )
    expect((detail.container.firstElementChild as HTMLElement).className).toContain('sm:max-w-[760px]')
  })

  it('队伍相关页面没有超过手机安全宽度的固定像素宽度', () => {
    const world = loadWorld()
    const teammateId = world.clubs[world.clubId].squadIds.find((id) => id !== world.playerId) as string

    const containers = [
      renderWithRouter(<TeamScreen />, { initialEntries: ['/team'] }).container,
      renderWithRouter(
        <Routes>
          <Route path="/team/:playerId" element={<TeamPlayerScreen />} />
        </Routes>,
        { initialEntries: [`/team/${teammateId}`] },
      ).container,
    ]

    for (const container of containers) {
      const tooWide = tooWideTokens(container)
      expect(tooWide).toEqual([])
    }
  })

  it('球员详情页的属性网格最多 3 列，10 项属性在手机上仍可读', () => {
    const world = loadWorld()
    renderWithRouter(
      <Routes>
        <Route path="/team/:playerId" element={<TeamPlayerScreen />} />
      </Routes>,
      { initialEntries: [`/team/${world.playerId}`] },
    )

    const baseGrids = tokensIn(document.body).filter((token) => /^grid-cols-\d+$/.test(token))
    expect(baseGrids.length).toBeGreaterThan(0)
    for (const token of baseGrids) {
      expect(Number(token.replace('grid-cols-', ''))).toBeLessThanOrEqual(3)
    }
  })
})

describe('绝技页手机契约', () => {
  it('图鉴行、我在练的行与详情页按钮都是 44px 触控目标', () => {
    loadWorld()

    const list = renderWithRouter(<MovesScreen />, { initialEntries: ['/moves'] })
    const rows = touchTargets(list.container)
    expect(rows.length).toBeGreaterThan(2)
    for (const row of rows) {
      expect(minHeightPx(row.className)).toBeGreaterThanOrEqual(44)
    }
    cleanup()

    const detail = renderWithRouter(
      <Routes>
        <Route path="/moves/:moveId" element={<MoveDetailScreen />} />
      </Routes>,
      { initialEntries: ['/moves/mv_rainbow'] },
    )
    for (const row of touchTargets(detail.container)) {
      expect(minHeightPx(row.className)).toBeGreaterThanOrEqual(44)
    }
  })

  it('绝技两页手机端占满宽度、桌面收到 760px，且没有超过手机安全宽度的固定像素', () => {
    loadWorld()

    const containers = [
      renderWithRouter(<MovesScreen />, { initialEntries: ['/moves'] }).container,
      renderWithRouter(
        <Routes>
          <Route path="/moves/:moveId" element={<MoveDetailScreen />} />
        </Routes>,
        { initialEntries: ['/moves/mv_rainbow'] },
      ).container,
    ]

    for (const container of containers) {
      const root = container.firstElementChild as HTMLElement
      expect(root.className).toContain('page-pad')
      expect(root.className).toContain('sm:mx-auto')
      expect(root.className).toContain('sm:max-w-[760px]')
      const tooWide = tooWideTokens(container)
      expect(tooWide).toEqual([])
    }
  })
})

describe('页面壳的横向溢出契约', () => {
  it('回归: 真机在 360px 下能把标题页横向拖出 42px — app-shell 必须自己截断', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')
    const shell = /\.app-shell\s*\{\s*@apply([^}]*)\}/.exec(css)?.[1] ?? ''

    expect(shell).not.toBe('')
    expect(shell).toContain('overflow-x-hidden')
  })
})
