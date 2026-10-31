import type { KeyMomentKind, KeyMomentOption } from '../../domain'
import {
  buildBigChance,
  buildCounterAttack,
  buildCross,
  buildLongShot,
  buildOneOnOne,
  buildThroughBall,
} from './keyMomentOptionsAttack'
import {
  buildClearance,
  buildDuel,
  buildHeaderDuel,
  buildSave,
} from './keyMomentOptionsDefense'
import { buildFreeKick, buildPenalty } from './keyMomentOptionsSetPiece'
import type { KindContext } from './optionUtils'

export type { KindContext } from './optionUtils'

const OPTION_BUILDERS: Record<KeyMomentKind, (context: KindContext) => KeyMomentOption[]> = {
  bigChance: buildBigChance,
  penalty: buildPenalty,
  throughBall: buildThroughBall,
  duel: buildDuel,
  save: buildSave,
  clearance: buildClearance,
  freeKick: buildFreeKick,
  headerDuel: buildHeaderDuel,
  oneOnOne: buildOneOnOne,
  counterAttack: buildCounterAttack,
  cross: buildCross,
  longShot: buildLongShot,
}

export const KIND_TITLES: Record<KeyMomentKind, string> = {
  bigChance: '禁区里的机会',
  penalty: '点球点前',
  throughBall: '中场的出球选择',
  duel: '防线前的对抗',
  save: '门前的考验',
  clearance: '禁区内的解围',
  freeKick: '任意球机会',
  headerDuel: '禁区上空的争顶',
  oneOnOne: '单刀面对门将',
  counterAttack: '由守转攻的瞬间',
  cross: '边路传中的选择',
  longShot: '禁区外的远射',
}

export const KIND_PROMPTS: Record<KeyMomentKind, string> = {
  bigChance: '球落到你脚下，禁区内只剩一次触球的空间。你准备怎么处理？',
  penalty: '裁判指向点球点。全场安静下来，你抱起球走向十二码。',
  throughBall: '队友前插，防线之间露出一条缝隙。球在你脚下。',
  duel: '对手带球向你逼近，身后就是禁区。你必须做出选择。',
  save: '对手在近距离起脚，你只有一瞬间判断方向。',
  clearance: '禁区里一片混乱，球正滚向危险区域。',
  freeKick: '哨声响起，人墙已经排好。这个位置的任意球由你来处理。',
  headerDuel: '传中球飞向禁区，你和对手同时起跳。',
  oneOnOne: '你甩开最后一名后卫，面前只剩门将。',
  counterAttack: '对手的进攻刚刚被断，大片空当出现在你面前。',
  cross: '你在边路拿到球，禁区内队友正在等待传中。',
  longShot: '防线退得很深，门将站位靠前。你有了远射的空间。',
}

export const KIND_TRIGGERS: Record<KeyMomentKind, string> = {
  bigChance: '禁区内获得一次近距离射门机会',
  penalty: '本方获得点球判罚',
  throughBall: '中场拿球且队友前插到防线身后',
  duel: '对手带球逼近本方禁区',
  save: '对手在禁区内完成近距离射门',
  clearance: '危险球进入本方禁区',
  freeKick: '本方在对方半场获得直接任意球',
  headerDuel: '传中球飞入禁区形成空中对抗',
  oneOnOne: '你获得单刀机会',
  counterAttack: '断球后出现快速反击空间',
  cross: '你在边路持球且禁区内有接应点',
  longShot: '防线后撤且门将站位靠前',
}

export function optionsFor(kind: KeyMomentKind, context: KindContext): KeyMomentOption[] {
  return OPTION_BUILDERS[kind](context)
}
