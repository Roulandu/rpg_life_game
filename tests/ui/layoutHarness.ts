import type { WorldState } from '../../src/domain'
import { useGameStore } from '../../src/store/gameStore'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

/** 手机上放不进 360px 视口的固定像素宽度阈值（页面左右各留 16px 内边距）。 */
export const PHONE_SAFE_PX = 340

/** Tailwind 任意值与档位都算出来：min-h-[44px] → 44，min-h-11 → 44。 */
export function minHeightPx(classList: string): number {
  const arbitrary = /(?:^|\s)min-h-\[(\d+(?:\.\d+)?)px\](?:\s|$)/.exec(classList)
  if (arbitrary) return Number(arbitrary[1])
  const step = /(?:^|\s)min-h-(\d+)(?:\s|$)/.exec(classList)
  if (step) return Number(step[1]) * 4
  // .btn-primary / .btn-secondary / .btn-ghost / .slider 在 styles.css 里统一 min-h-11
  return /(?:^|\s)(?:btn-(?:primary|secondary|ghost)|slider)(?:\s|$)/.test(classList) ? 44 : 0
}

/** 显式定宽：w-[44px] → 44，w-11 → 44；w-full / w-auto 这类相对宽度返回 0。 */
export function fixedWidthPx(classList: string): number {
  const arbitrary = /(?:^|\s)w-\[(\d+(?:\.\d+)?)px\](?:\s|$)/.exec(classList)
  if (arbitrary) return Number(arbitrary[1])
  const step = /(?:^|\s)w-(\d+)(?:\s|$)/.exec(classList)
  return step ? Number(step[1]) * 4 : 0
}

/**
 * 宽度方向的最小值，与 minHeightPx 成对。
 * flex 行里只写 `w-11` 不算数：相邻内容一长就会被一路压缩（真机实测 44px 的删除键被挤到 17.7px），
 * 所以只有 `min-w-*` 或显式禁止收缩（shrink-0 / flex-none）才给得出最小宽度，否则视为可压到 0。
 */
export function minWidthPx(classList: string): number {
  const arbitrary = /(?:^|\s)min-w-\[(\d+(?:\.\d+)?)px\](?:\s|$)/.exec(classList)
  if (arbitrary) return Number(arbitrary[1])
  const step = /(?:^|\s)min-w-(\d+)(?:\s|$)/.exec(classList)
  if (step) return Number(step[1]) * 4
  const fixed = fixedWidthPx(classList)
  if (fixed === 0) return 0
  return /(?:^|\s)(?:shrink-0|flex-none)(?:\s|$)/.test(classList) ? fixed : 0
}

export function tokensIn(container: HTMLElement): string[] {
  return Array.from(new Set(container.querySelectorAll<HTMLElement>('*'))).flatMap((el) =>
    (el.getAttribute('class') ?? '').split(/\s+/),
  ).filter(Boolean)
}

export function touchTargets(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('a, button'))
}

/** 只有图标、没有可读文字的可点目标：宽度全靠 class 声明，压不下去才有 44px。 */
export function iconOnlyTargets(container: HTMLElement): HTMLElement[] {
  return touchTargets(container).filter((el) => !isRangeInput(el) && !(el.textContent ?? '').trim())
}

/** 定宽标称够、但能被压缩到不够的目标——「写了 w-11 却量不出 44px」的那一类。 */
export function squashedTargets(container: HTMLElement): HTMLElement[] {
  return touchTargets(container).filter((el) => {
    const classList = el.className
    return fixedWidthPx(classList) >= 44 && minWidthPx(classList) < 44
  })
}

export function isRangeInput(el: HTMLElement): boolean {
  return el.tagName === 'INPUT' && el.getAttribute('type') === 'range'
}

/** 原生 range 的可见高度就是手指的命中高度，jsdom 量不了布局，所以按 class 口径判。 */
export function rangeInputs(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('input[type=range]'))
}

/** 页面本体里超过手机安全宽度的固定像素 class。 */
export function tooWideTokens(container: HTMLElement): string[] {
  return tokensIn(container).filter((token) => {
    const match = /^(?:w|min-w|max-w)-\[(\d+(?:\.\d+)?)px\]$/.exec(token)
    return match !== null && Number(match[1]) > PHONE_SAFE_PX
  })
}

/** 只读布局契约用的正常世界：不注入事件、不改金额，量的是页面本来的样子。 */
export function loadWorld(): WorldState {
  const world = generateWorld(testOptions(), TEST_NOW)
  useGameStore.setState({ world, hydrated: true, saves: [] })
  return world
}
