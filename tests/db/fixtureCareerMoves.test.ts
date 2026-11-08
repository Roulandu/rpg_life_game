import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CURRENT_SAVE_VERSION,
  MOVE_MAX_LEVEL,
  moveById,
  moveFitsPosition,
  overall,
} from '../../src/domain'
import type { PlayerMove, WorldState } from '../../src/domain'
import { exportWorld, importWorld } from '../../src/db/repository'
import { hashString, canonicalStringify } from '../../src/lib'

/**
 * 职责：守住 `tests/fixtures/career-with-moves.v12.json` 这份「有真进度」的存档夹具。
 * 边界：夹具由 `npm run fixture:moves-career` 用默认属性跑真实整季产出，本文件只验它自不自洽、能不能导入。
 * 档位：文件刻意停在 v12 / 0.17.0，所以它同时是「旧版本档」的迁移样本；升版本时不要把它改成当前档。
 * 依赖：src/db 的导出/导入口、src/lib 的规范化哈希。
 */
const FIXTURE = 'tests/fixtures/career-with-moves.v12.json'

interface SaveEnvelope {
  format: string
  saveVersion: number
  engineVersion: string
  checksum: string
  world: WorldState
}

function readEnvelope(): SaveEnvelope {
  return JSON.parse(readFileSync(resolve(process.cwd(), FIXTURE), 'utf8')) as SaveEnvelope
}

function userOf(world: WorldState) {
  return world.players[world.playerId]
}

function recordsOf(world: WorldState): PlayerMove[] {
  return userOf(world).moves ?? []
}

function viaOf(moveId: string): string[] {
  return moveById(moveId)?.unlock.via ?? []
}

describe('带绝技进度的 v12 夹具存档', () => {
  it('夹具是 v12 时代（0.17.0）的存档，校验和与规范化后的世界一致', () => {
    const envelope = readEnvelope()

    expect(envelope.format).toBe('pitch-life-save')
    expect(envelope.saveVersion).toBe(12)
    expect(envelope.engineVersion).toBe('0.17.0')
    expect(envelope.checksum).toBe(hashString(canonicalStringify(envelope.world)))
  })

  it('v12 旧档导入时升到当前版本，再来一次往返不再改变世界', () => {
    const envelope = readEnvelope()

    const imported = importWorld(JSON.stringify(envelope))
    const once = canonicalStringify(imported)
    const twice = canonicalStringify(importWorld(exportWorld(imported)))

    expect(imported.version).toBe(CURRENT_SAVE_VERSION)
    expect(twice).toBe(once)
    expect(recordsOf(imported)).toEqual(recordsOf(envelope.world))
  })

  it('四条获取路径在这份存档里都留了痕', () => {
    const records = recordsOf(readEnvelope().world)

    expect(records.length).toBeGreaterThanOrEqual(3)
    expect(records.some((item) => item.level >= 2)).toBe(true)
    expect(records.some((item) => viaOf(item.moveId).includes('mentor') && item.level >= 1)).toBe(true)
    expect(records.some((item) => viaOf(item.moveId).includes('matchDrop') && item.level + item.progress > 0)).toBe(true)
    expect(records.some((item) => viaOf(item.moveId).includes('exp'))).toBe(true)
  })

  it('存档里的每条绝技都过得了位置与综合分闸门', () => {
    const world = readEnvelope().world
    const user = userOf(world)

    for (const record of recordsOf(world)) {
      const move = moveById(record.moveId)
      expect(move, `夹具里的绝技不存在：${record.moveId}`).toBeTruthy()
      expect(moveFitsPosition(move!, user.position), `${record.moveId} 与本位置对不上`).toBe(true)
      expect(record.level).toBeLessThanOrEqual(MOVE_MAX_LEVEL)
      expect(record.progress).toBeGreaterThanOrEqual(0)
      if (record.level >= 1) {
        expect(overall(user), `${record.moveId} 越过了 ${record.level} 级门槛`).toBeGreaterThanOrEqual(
          move!.levels[record.level - 1].minOverall,
        )
      }
    }
  })
})
