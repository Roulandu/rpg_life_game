import { describe, expect, it } from 'vitest'
import {
  KEY_MOMENT_KINDS,
  MOVE_PACK_NAMES,
  MOVE_PROGRESS_PER_LEVEL,
  RARITY_LABELS,
  RARITY_ORDER,
  allMoves,
  investMoveCost,
  moveById,
  moveLevelOf,
  movesTargeting,
  nextMoveLevel,
  resolveMoveTerms,
} from '../../src/domain'
import type { Player, PlayerMove } from '../../src/domain'

const MOVE_COUNT_FLOOR = 64

function playerWith(moves: PlayerMove[]): Player {
  return { moves } as unknown as Player
}

function playerWithOverall(overall: number, moves: PlayerMove[] = []): Player {
  return {
    moves,
    attributes: Object.fromEntries(
      ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'mental', 'technique', 'stamina', 'goalkeeping'].map((k) => [k, overall]),
    ),
    position: 'ST',
  } as unknown as Player
}

describe('绝技数据注册表', () => {
  it('规模达标：至少 64 条绝技且分包加载', () => {
    const moves = allMoves()
    expect(moves.length).toBeGreaterThanOrEqual(MOVE_COUNT_FLOOR)
    expect(MOVE_PACK_NAMES.length).toBeGreaterThanOrEqual(6)
  })

  it('每条绝技的 id 唯一，中文名不含拉丁字母', () => {
    const seen = new Set<string>()
    for (const move of allMoves()) {
      expect(seen.has(move.id)).toBe(false)
      seen.add(move.id)
      expect(moveById(move.id)).toBe(move)
      expect(move.nameZh).toBeTruthy()
      expect(move.nameZh).not.toMatch(/[A-Za-z]/)
      expect(move.textZh.success).toBeTruthy()
      expect(move.textZh.fail).toBeTruthy()
    }
  })

  it('稀有度只有四档，标签是中文', () => {
    expect(RARITY_ORDER).toEqual(['common', 'rare', 'signature', 'legendary'])
    for (const rarity of RARITY_ORDER) {
      expect(RARITY_LABELS[rarity]).toBeTruthy()
      expect(RARITY_LABELS[rarity]).not.toMatch(/[A-Za-z]/)
    }
    for (const move of allMoves()) {
      expect(RARITY_ORDER).toContain(move.rarity)
    }
  })
})

describe('绝技目标与等级形状', () => {
  it('回归: 目标格式必须是 关键回合:选项，且关键回合合法', () => {
    for (const move of allMoves()) {
      expect(move.targets.length).toBeGreaterThan(0)
      for (const target of move.targets) {
        const [kind, optionId] = target.split(':')
        expect(KEY_MOMENT_KINDS).toContain(kind)
        expect(target.split(':')).toHaveLength(2)
        expect(optionId).toBeTruthy()
      }
    }
  })

  it('回归: 三级的门槛、花费与加成必须单调递增', () => {
    for (const move of allMoves()) {
      expect(move.levels).toHaveLength(3)
      const [one, two, three] = move.levels
      expect(two.minOverall).toBeGreaterThan(one.minOverall)
      expect(three.minOverall).toBeGreaterThan(two.minOverall)
      expect(two.costExp).toBeGreaterThan(one.costExp)
      expect(three.costExp).toBeGreaterThan(two.costExp)
      expect(two.chanceDelta).toBeGreaterThan(one.chanceDelta)
      expect(three.chanceDelta).toBeGreaterThan(two.chanceDelta)
    }
  })
})

describe('绝技稀有度预算与获取路径', () => {
  it('回归: 稀有度越高加成越大，并且都不越过预算上限', () => {
    const budget: Record<string, number> = {
      common: 0.045,
      rare: 0.065,
      signature: 0.085,
      legendary: 0.11,
    }
    for (const move of allMoves()) {
      expect(move.levels[2].chanceDelta).toBeLessThanOrEqual(budget[move.rarity])
    }
    const common = allMoves().filter((m) => m.rarity === 'common')
    const legendary = allMoves().filter((m) => m.rarity === 'legendary')
    const avg = (list: typeof common) =>
      list.reduce((sum, m) => sum + m.levels[2].chanceDelta, 0) / list.length
    expect(avg(legendary)).toBeGreaterThan(avg(common))
  })

  it('位置与解锁路径合法，四条获取路径都真的有人用', () => {
    const groups = ['GK', 'DEF', 'MID', 'FWD']
    for (const move of allMoves()) {
      for (const group of move.positions) expect(groups).toContain(group)
      expect(move.unlock.via.length).toBeGreaterThan(0)
      expect(move.unlock.via).toContain('exp')
      for (const path of move.unlock.via) {
        expect(['exp', 'mentor', 'specialization', 'matchDrop']).toContain(path)
      }
    }
    for (const path of ['mentor', 'specialization', 'matchDrop'] as const) {
      expect(allMoves().some((m) => m.unlock.via.includes(path))).toBe(true)
    }
  })

  it('对手压制项合法：角色与属性都在白名单内，系数为正', () => {
    for (const move of allMoves()) {
      if (!move.counter) continue
      expect(['keeper', 'marker', 'shooter']).toContain(move.counter.role)
      expect(move.counter.coefficient).toBeGreaterThan(0)
      expect(move.counter.labelZh).toBeTruthy()
      expect(move.counter.labelZh).not.toMatch(/[A-Za-z]/)
    }
  })
})

describe('绝技的持有与升级查询', () => {
  it('未持有返回 0 级，持有后按记录给出等级', () => {
    expect(moveLevelOf(playerWith([]), 'rainbow-flick')).toBe(0)
    expect(moveLevelOf(playerWith([{ moveId: 'rainbow-flick', level: 2, progress: 1 }]), 'rainbow-flick')).toBe(2)
  })

  it('按目标查表：同一选项可以被多条绝技命中，不命中时给空数组', () => {
    const hits = movesTargeting('oneOnOne', 'round')
    expect(hits.length).toBeGreaterThan(0)
    for (const move of hits) expect(move.targets).toContain('oneOnOne:round')
    expect(movesTargeting('oneOnOne', '不存在的选项')).toEqual([])
  })

  it('升级花费取下一级；已满级给 null', () => {
    const move = allMoves()[0]
    expect(investMoveCost(move, 0)).toBe(move.levels[0].costExp)
    expect(investMoveCost(move, 2)).toBe(move.levels[2].costExp)
    expect(investMoveCost(move, 3)).toBeNull()
  })

  it('回归: 升级要同时满足综合分门槛与修炼进度', () => {
    const move = allMoves().find((m) => m.unlock.via.includes('matchDrop')) as ReturnType<typeof allMoves>[number]
    const gate = move.levels[1].minOverall
    const held: PlayerMove[] = [{ moveId: move.id, level: 1, progress: MOVE_PROGRESS_PER_LEVEL }]
    expect(nextMoveLevel(playerWithOverall(gate - 1, held), move)).toBeNull()
    expect(nextMoveLevel(playerWithOverall(gate, held), move)?.level).toBe(2)

    const notReady: PlayerMove[] = [{ moveId: move.id, level: 1, progress: MOVE_PROGRESS_PER_LEVEL - 1 }]
    expect(nextMoveLevel(playerWithOverall(99, notReady), move)).toBeNull()
  })
})

describe('绝技进概率', () => {
  it('未持有绝技时不产生任何加成项', () => {
    const terms = resolveMoveTerms(playerWith([]), 'oneOnOne', 'round', { keeper: null, marker: null, shooter: null })
    expect(terms).toEqual([])
  })

  it('持有后加成等于该等级的 chanceDelta，标签带中文名与等级', () => {
    const move = allMoves().find((m) => !m.counter && m.targets.includes('oneOnOne:round'))
    if (!move) return
    const terms = resolveMoveTerms(
      playerWith([{ moveId: move.id, level: 2, progress: 0 }]),
      'oneOnOne',
      'round',
      { keeper: null, marker: null, shooter: null },
    )
    const hit = terms.find((term) => term.text.includes(move.nameZh)) as { text: string; delta: number }
    expect(hit.delta).toBeCloseTo(move.levels[1].chanceDelta, 6)
    expect(hit.text).not.toMatch(/undefined|NaN/)
  })

  it('回归: 对手压制项会从加成里扣掉，且写成单独一条依据', () => {
    const move = allMoves().find((m) => m.counter && m.targets.length > 0) as ReturnType<typeof allMoves>[number]
    const [kind, optionId] = move.targets[0].split(':')
    const foe = {
      attributes: { goalkeeping: 80, defending: 80, pace: 80, shooting: 80, physical: 80, mental: 80, technique: 80, stamina: 80, passing: 80, dribbling: 80 },
    } as unknown as Player
    const bare = resolveMoveTerms(
      playerWith([{ moveId: move.id, level: 3, progress: 0 }]),
      kind as never,
      optionId,
      { keeper: null, marker: null, shooter: null },
    )
    const pressed = resolveMoveTerms(
      playerWith([{ moveId: move.id, level: 3, progress: 0 }]),
      kind as never,
      optionId,
      { keeper: foe, marker: foe, shooter: foe },
    )
    const sum = (terms: typeof bare) => terms.reduce((total, term) => total + term.delta, 0)
    expect(sum(pressed)).toBeLessThan(sum(bare))
    expect(pressed.some((term) => term.text.includes('对手'))).toBe(true)
  })
})
