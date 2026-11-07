import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { WorldState } from '../../src/domain'
import { exportWorld, importSave, saveWorld, summarizeWorld } from '../../src/db/repository'
import { db } from '../../src/db/db'
import { useGameStore } from '../../src/store/gameStore'
import { TitleSaveRow } from '../../src/ui/screens/title/TitleSaveRow'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'

/**
 * 导入此前一律另开一条存档：同一个文件导两次就是两条看上去一模一样的生涯，
 * 既认不出也盖不回去。事实源是导出文件里那条来源 id。
 */
const INITIAL_STATE = {
  world: null,
  saveId: null,
  saves: [],
  lastTurn: null,
  seasonTransition: null,
  busy: false,
  hydrated: false,
  notice: null,
  error: null,
}

function worldAtWeek(week: number): WorldState {
  const world = generateWorld(testOptions({ seed: 2026 }), TEST_NOW)
  world.week = week
  return world
}

beforeEach(async () => {
  await db.saves.clear()
  await db.meta.clear()
  useGameStore.setState(INITIAL_STATE as never)
})

describe('导出文件带上来源存档 id', () => {
  it('exportWorld 的第二参数写进 envelope', () => {
    const text = exportWorld(worldAtWeek(2), 'save:alpha')

    expect(JSON.parse(text)).toMatchObject({ saveId: 'save:alpha' })
  })

  it('不带 id 导出的旧文件照旧合法，importSave 报 null', () => {
    const text = exportWorld(worldAtWeek(3))
    const envelope = JSON.parse(text) as { saveId?: string }

    expect(envelope.saveId).toBeUndefined()
    expect(importSave(text).saveId).toBeNull()
    expect(importSave(text).world.week).toBe(3)
  })
})

describe('导入按来源 id 原位覆盖', () => {
  it('同一个 id 再导入只更新那一条，不新增存档', async () => {
    await saveWorld(worldAtWeek(2), 'save:alpha')
    const first = exportWorld(worldAtWeek(2), 'save:alpha')
    const second = exportWorld(worldAtWeek(6), 'save:alpha')

    expect(await useGameStore.getState().importFromText(first)).toBe(true)
    expect(await useGameStore.getState().importFromText(second)).toBe(true)

    const rows = await db.saves.toArray()
    expect(rows.map((row) => row.id)).toEqual(['save:alpha'])
    expect(rows[0]?.world.week).toBe(6)
  })

  it('文件里没有 id 时仍然新建，绝不覆盖别人的生涯', async () => {
    await saveWorld(worldAtWeek(1), 'save:beta')
    const legacy = exportWorld(worldAtWeek(9))

    expect(await useGameStore.getState().importFromText(legacy)).toBe(true)

    const rows = await db.saves.toArray()
    expect(rows).toHaveLength(2)
    expect(rows.find((row) => row.id === 'save:beta')?.world.week).toBe(1)
  })

  it('导入损坏文件不覆盖任何存档', async () => {
    await saveWorld(worldAtWeek(4), 'save:gamma')

    expect(await useGameStore.getState().importFromText('{broken')).toBe(false)

    const rows = await db.saves.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0]?.world.week).toBe(4)
  })
})

describe('存档摘要能分辨两份同周期存档', () => {
  it('摘要带上种子与创建时间', () => {
    const world = worldAtWeek(2)

    const summary = summarizeWorld(world, 'save:alpha')

    expect(summary.seed).toBe(world.seed)
    expect(summary.createdAt).toBe(world.createdAt)
  })

  it('列表行把种子显示出来', () => {
    const summary = summarizeWorld(worldAtWeek(2), 'save:alpha')

    render(
      <TitleSaveRow save={summary} active={false} onLoad={() => undefined} onAskDelete={() => undefined} />,
    )

    expect(screen.getByText(new RegExp(`种子 ${summary.seed}`))).toBeInTheDocument()
  })
})
