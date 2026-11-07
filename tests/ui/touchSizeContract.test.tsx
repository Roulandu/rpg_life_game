import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'
import type { SaveSummary } from '../../src/domain'
import { CreateCareerScreen, SettingsScreen, TitleScreen } from '../../src/ui'
import { useGameStore } from '../../src/store/gameStore'
import {
  fixedWidthPx,
  iconOnlyTargets,
  loadWorld,
  minHeightPx,
  minWidthPx,
  rangeInputs,
  squashedTargets,
  touchTargets,
} from './layoutHarness'
import { renderWithRouter } from './renderScreen'
import { resetUiStore } from './resetStore'

/**
 * 职责：钉住「宽度方向也够 44px」和「滑块按得住」——layoutContract 只量高度，
 * 所以真机上 17.7px 的删除键与 33px 的主题按钮一路漏检，这两维由本文件补齐。
 * 边界：读 class 口径判尺寸，jsdom 没有布局引擎；真实像素由 scripts/quality/sweep 类真机脚本复核。
 * 依赖：src/ui 的三个页面与 tests/ui/layoutHarness 的尺寸口径。
 */

const saveRow: SaveSummary = {
  id: 'save:touch',
  playerName: '林远',
  clubName: '北看台联',
  season: 2026,
  week: 2,
  day: 3,
  age: 19,
  overall: 62,
  seed: 2026,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
}

afterEach(() => {
  cleanup()
  resetUiStore()
})

describe('触控目标的宽度契约', () => {
  it('回归: 存档列表的删除按钮被挤成 17.7px 宽', () => {
    useGameStore.setState({ saves: [saveRow], saveId: saveRow.id, hydrated: true })
    const { container } = renderWithRouter(<TitleScreen />, { initialEntries: ['/'] })

    const squashed = squashedTargets(container).map(
      (el) =>
        `${el.getAttribute('aria-label') ?? el.textContent?.trim()} 标称 ${fixedWidthPx(el.className)}px，最小只剩 ${minWidthPx(el.className)}px`,
    )
    expect(squashed).toEqual([])
  })

  it('回归: 纯图标按钮没有撑得住的最小宽度（真机实测主题切换只有 33px）', () => {
    useGameStore.setState({ saves: [saveRow], hydrated: true })
    const { container } = renderWithRouter(<TitleScreen />, { initialEntries: ['/'] })

    expect(iconOnlyTargets(container).length).toBeGreaterThan(0)
    const narrow = iconOnlyTargets(container)
      .filter((el) => minWidthPx(el.className) < 44)
      .map((el) => `${el.getAttribute('aria-label') ?? ''} @ ${el.className}`)
    expect(narrow).toEqual([])
  })
})

describe('滑块的触控契约', () => {
  it('回归: 滑块可点高度不足 44px', () => {
    loadWorld()

    const containers = [
      renderWithRouter(<CreateCareerScreen />, { initialEntries: ['/create'] }).container,
      renderWithRouter(<SettingsScreen />, { initialEntries: ['/settings'] }).container,
    ]
    const sliders = containers.flatMap((container) => rangeInputs(container))
    expect(sliders.length).toBeGreaterThanOrEqual(2)

    const short = sliders.filter((el) => minHeightPx(el.className) < 44).map((el) => el.className)
    expect(short).toEqual([])
  })
})

describe('建号页与设置页的触控契约', () => {
  /**
   * 这两页此前只被滑块契约覆盖：`chip` 与 `py-3` 这类没有 min-h 的按钮
   * 在真机上是 24–40px，手指按不准，而类名里读不出「44px」。
   */
  function shortTargets(container: HTMLElement): string[] {
    return touchTargets(container)
      .filter((el) => minHeightPx(el.className) < 44)
      .map((el) => `${el.getAttribute('aria-label') ?? el.textContent?.trim()} @ ${el.className}`)
  }

  function narrowIcons(container: HTMLElement): string[] {
    return iconOnlyTargets(container)
      .filter((el) => minWidthPx(el.className) < 44)
      .map((el) => `${el.getAttribute('aria-label') ?? ''} @ ${el.className}`)
  }

  it('建号页每个可点行都声明 44px 最小高度，「随机」也不例外', () => {
    const { container } = renderWithRouter(<CreateCareerScreen />, { initialEntries: ['/create'] })

    expect(shortTargets(container)).toEqual([])
  })

  it('设置页的三条数据按钮与「显示 Key」都够 44px 高', () => {
    loadWorld()
    const { container } = renderWithRouter(<SettingsScreen />, { initialEntries: ['/settings'] })

    expect(touchTargets(container).length).toBeGreaterThan(4)
    expect(shortTargets(container)).toEqual([])
  })

  it('纯图标按钮同时要有 44px 的最小宽度', () => {
    const containers = [
      renderWithRouter(<CreateCareerScreen />, { initialEntries: ['/create'] }).container,
      renderWithRouter(<SettingsScreen />, { initialEntries: ['/settings'] }).container,
    ]

    expect(narrowIcons(containers[0]!)).toEqual([])
    expect(narrowIcons(containers[1]!)).toEqual([])
  })
})
