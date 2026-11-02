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
  // .btn-primary / .btn-secondary / .btn-ghost 在 styles.css 里统一 min-h-11
  return /(?:^|\s)btn-(?:primary|secondary|ghost)(?:\s|$)/.test(classList) ? 44 : 0
}

export function tokensIn(container: HTMLElement): string[] {
  return Array.from(new Set(container.querySelectorAll<HTMLElement>('*'))).flatMap((el) =>
    (el.getAttribute('class') ?? '').split(/\s+/),
  ).filter(Boolean)
}

export function touchTargets(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('a, button'))
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
