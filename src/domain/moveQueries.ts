import { ATTR_LABELS, overall, positionGroup, round1 } from './attributes'
import { MOVE_PROGRESS_PER_LEVEL, MOVES } from './moves'
import type {
  MoveBonusTerm,
  MoveCounter,
  MoveCounterRole,
  MoveDefinition,
  MoveOpponents,
} from './moves'
import type { AttrKey, KeyMomentKind, Player, PlayerMove, Position } from './types'

/**
 * 绝技查询与概率折算：数据加载与结构校验在 `./moves`，这里只做只读索引。
 * 分成两个文件是为了让内容层（Zod + 数据包）与机制层（持有、升级、进概率）各自可读。
 */

const MOVE_INDEX = new Map(MOVES.map((move) => [move.id, move]))

export function moveById(id: string): MoveDefinition | undefined {
  return MOVE_INDEX.get(id)
}

const TARGET_INDEX = new Map<string, MoveDefinition[]>()

for (const move of MOVES) {
  for (const target of move.targets) {
    const bucket = TARGET_INDEX.get(target)
    if (bucket) bucket.push(move)
    else TARGET_INDEX.set(target, [move])
  }
}

/** 命中某个关键回合选项的绝技：一个选项允许多条命中，取哪条由持有情况决定。 */
export function movesTargeting(kind: KeyMomentKind | string, optionId: string): MoveDefinition[] {
  return TARGET_INDEX.get(`${kind}:${optionId}`) ?? []
}

export function moveLevelOf(player: Player, moveId: string): number {
  return player.moves?.find((held) => held.moveId === moveId)?.level ?? 0
}

/** 下一级要花多少经验；满级给 null，界面据此把按钮换成「已练到尽头」。 */
export function investMoveCost(move: MoveDefinition, currentLevel: number): number | null {
  if (currentLevel >= move.levels.length) return null
  return move.levels[Math.max(0, currentLevel)].costExp
}

/** 位置闸门：绝技只喂给真正用得上它的位置组，投错了位置等于把经验烧掉。 */
export function moveFitsPosition(move: MoveDefinition, position: Position): boolean {
  return move.positions.includes(positionGroup(position))
}

/** 这一档的门槛够不够：`currentLevel` 是已练到的级数，要买的是下一级。 */
export function moveLevelGatePassed(move: MoveDefinition, player: Player): boolean {
  const next = move.levels[Math.max(0, moveLevelOf(player, move.id))]
  return next !== undefined && overall(player) >= next.minOverall
}

/** 修炼进度攒满一格、且综合分过门槛时给出的新持有记录；不满足条件返回 null。 */
export function nextMoveLevel(player: Player, move: MoveDefinition): PlayerMove | null {
  const held = player.moves?.find((item) => item.moveId === move.id)
  if (!held || held.level < 1 || held.level >= move.levels.length) return null
  if (held.progress < MOVE_PROGRESS_PER_LEVEL) return null
  if (overall(player) < move.levels[held.level].minOverall) return null
  return { moveId: move.id, level: held.level + 1, progress: 0 }
}

const ROLE_LABELS: Record<MoveCounterRole, string> = { keeper: '门将', marker: '后卫', shooter: '前锋' }

/** 罗马数字用 Unicode 区码，避免界面里出现拉丁字母 I/II/III。 */
export const MOVE_LEVEL_MARKS = ['Ⅰ', 'Ⅱ', 'Ⅲ']

function percentText(delta: number): string {
  const points = round1(Math.abs(delta) * 100)
  return delta >= 0 ? `+${points}%` : `-${points}%`
}

function counterTerm(counter: MoveCounter, foe: Player | null): MoveBonusTerm | null {
  if (!foe) return null
  const attrKey = counter.attr as AttrKey
  const value = foe.attributes[attrKey]
  const delta = -(counter.coefficient * value)
  const roleLabel = ROLE_LABELS[counter.role]
  const attrLabel = ATTR_LABELS[attrKey] === roleLabel ? '' : ` ${ATTR_LABELS[attrKey]}`
  return { text: `对手${roleLabel}${attrLabel} ${value} ${percentText(delta)}`, delta }
}

/**
 * 把「我持有的绝技」与「对位对手」一起折算成概率依据。
 * 必须在关键回合生成阶段调用：选项的 roll 是那时预抽的，结算阶段不能再改概率。
 */
export function resolveMoveTerms(
  player: Player,
  kind: KeyMomentKind | string,
  optionId: string,
  opponents: MoveOpponents,
): MoveBonusTerm[] {
  const terms: MoveBonusTerm[] = []
  for (const move of movesTargeting(kind, optionId)) {
    const level = moveLevelOf(player, move.id)
    if (level < 1) continue
    const spec = move.levels[level - 1]
    terms.push({
      text: `${move.nameZh} ${MOVE_LEVEL_MARKS[level - 1] ?? ''} ${percentText(spec.chanceDelta)}`,
      delta: spec.chanceDelta,
    })
    if (move.counter) {
      const term = counterTerm(move.counter, opponents[move.counter.role])
      if (term) terms.push(term)
    }
  }
  return terms
}
