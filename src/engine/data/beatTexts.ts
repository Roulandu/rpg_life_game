import type { BeatKind } from '../../domain'

export interface BeatTextContext {
  player: string
  team: string
  opponent: string
}

const TEMPLATES: Record<BeatKind, string[]> = {
  attack: [
    '{player} 带球推进，{team} 把阵型压过中场。',
    '{team} 连续传递，{player} 在前场寻找空当。',
    '{player} 回撤接应，{team} 重新组织进攻。',
  ],
  shot: ['{player} 起脚打门，皮球偏出立柱。', '{player} 的抽射被封堵出底线。'],
  corner: [
    '{player} 的传中被挡出底线，{team} 获得角球。',
    '{team} 在右路制造混乱，皮球出了底线。',
  ],
  foul: [
    '{player} 在拼抢中犯规，{opponent} 获得任意球。',
    '{player} 拉倒了对手，裁判鸣哨。',
  ],
  offside: [
    '{player} 前插过早，边裁举旗示意越位。',
    '{team} 的直塞被判越位在先。',
  ],
}

const SHOT_ON_TARGET = [
  '{player} 的射门迫使门将做出扑救。',
  '{player} 低射近角，门将倒地没收。',
]

function fill(template: string, context: BeatTextContext): string {
  return template
    .replaceAll('{player}', context.player)
    .replaceAll('{team}', context.team)
    .replaceAll('{opponent}', context.opponent)
}

export function beatText(
  kind: BeatKind,
  context: BeatTextContext,
  onTarget = false,
  variant = 0,
): string {
  const pool = kind === 'shot' && onTarget ? SHOT_ON_TARGET : TEMPLATES[kind]
  return fill(pool[variant % pool.length]!, context)
}
