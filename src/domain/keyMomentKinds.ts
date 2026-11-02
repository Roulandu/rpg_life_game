import type { KeyMomentKind } from './matchTypes'

/**
 * 关键回合类型的运行时清单：绝技数据包的目标要按这张表校验，
 * 编译期再由下面这行兜住「union 加了新成员但清单漏了」。
 */
export const KEY_MOMENT_KINDS = [
  'bigChance',
  'penalty',
  'throughBall',
  'duel',
  'save',
  'clearance',
  'freeKick',
  'headerDuel',
  'oneOnOne',
  'counterAttack',
  'cross',
  'longShot',
] as const satisfies readonly KeyMomentKind[]

type MissingKind = Exclude<KeyMomentKind, (typeof KEY_MOMENT_KINDS)[number]>
const KIND_COVERAGE: MissingKind[] = []
void KIND_COVERAGE

export type KeyMomentKindList = typeof KEY_MOMENT_KINDS[number]
