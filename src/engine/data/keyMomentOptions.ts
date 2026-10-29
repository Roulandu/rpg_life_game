import { clamp, round1 } from '../../domain'
import type { KeyMomentKind, KeyMomentOption, Player } from '../../domain'

export interface KindContext {
  player: Player
  isHome: boolean
}

interface OptionSpec {
  id: string
  labelZh: string
  descriptionZh: string
  successChance: number
  ratingOnSuccess: number
  ratingOnFail: number
  extra?: Partial<KeyMomentOption>
}

function chance(value: number, low: number, high: number): number {
  return round1(clamp(value, low, high) * 100) / 100
}

function option(spec: OptionSpec): KeyMomentOption {
  const { extra, ...base } = spec
  return { ...base, ...extra }
}

function buildBigChance({ player }: KindContext): KeyMomentOption[] {
  const attrs = player.attributes
  const mental = attrs.mental / 100
  return [
    option({
      id: 'shoot', labelZh: '直接射门', descriptionZh: '把握机会自己解决，角度被封堵时容易浪费。',
      successChance: chance(0.3 + attrs.shooting * 0.004 + mental * 0.08, 0.2, 0.74), ratingOnSuccess: 0.75, ratingOnFail: -0.35,
      extra: { goalOnSuccess: true, coachOnSuccess: 0.5, moraleOnSuccess: 2, moraleOnFail: -1 },
    }),
    option({
      id: 'square', labelZh: '横传队友', descriptionZh: '把球送到更好的位置，可能收获一次助攻。',
      successChance: chance(0.48 + attrs.passing * 0.003, 0.4, 0.86), ratingOnSuccess: 0.45, ratingOnFail: -0.1,
      extra: { assistOnSuccess: true, coachOnSuccess: 0.4, moraleOnSuccess: 1.5 },
    }),
    option({
      id: 'hold', labelZh: '护球等待支援', descriptionZh: '几乎不会丢球，但很难制造直接威胁。',
      successChance: 0.92, ratingOnSuccess: 0.05, ratingOnFail: -0.05,
      extra: { moraleOnSuccess: 0.5 },
    }),
  ]
}

function buildPenalty({ player }: KindContext): KeyMomentOption[] {
  const attrs = player.attributes
  return [
    option({
      id: 'placed', labelZh: '推射死角', descriptionZh: '稳妥的角度与力量，门将很难够到。',
      successChance: chance(0.68 + attrs.shooting * 0.002, 0.55, 0.88), ratingOnSuccess: 0.9, ratingOnFail: -0.7,
      extra: { goalOnSuccess: true, coachOnSuccess: 0.6, moraleOnSuccess: 3, moraleOnFail: -2 },
    }),
    option({
      id: 'power', labelZh: '大力抽射', descriptionZh: '用力量压制门将，但容错更低。',
      successChance: chance(0.58 + attrs.shooting * 0.002, 0.45, 0.8), ratingOnSuccess: 1, ratingOnFail: -0.8,
      extra: { goalOnSuccess: true, coachOnSuccess: 0.5, moraleOnSuccess: 3, moraleOnFail: -2 },
    }),
    option({
      id: 'panenka', labelZh: '勺子点球', descriptionZh: '如果能骗过门将，这会成为本轮话题。',
      successChance: chance(0.4 + attrs.technique * 0.003, 0.3, 0.7), ratingOnSuccess: 1.35, ratingOnFail: -1.1,
      extra: { goalOnSuccess: true, coachOnSuccess: 0.2, moraleOnSuccess: 4, moraleOnFail: -3 },
    }),
  ]
}

function buildThroughBall({ player }: KindContext): KeyMomentOption[] {
  const attrs = player.attributes
  return [
    option({
      id: 'thread', labelZh: '直塞身后', descriptionZh: '最危险也最致命的选择，需要精准的脚法。',
      successChance: chance(0.34 + attrs.passing * 0.004, 0.28, 0.72), ratingOnSuccess: 0.65, ratingOnFail: -0.4,
      extra: { assistOnSuccess: true, coachOnSuccess: 0.5, moraleOnSuccess: 2 },
    }),
    option({
      id: 'simple', labelZh: '分边转移', descriptionZh: '把球送到安全区域，保持球队的节奏。',
      successChance: chance(0.74 + attrs.passing * 0.0015, 0.6, 0.9), ratingOnSuccess: 0.15, ratingOnFail: -0.1,
      extra: { coachOnSuccess: 0.2 },
    }),
    option({
      id: 'carry', labelZh: '自己带球推进', descriptionZh: '用盘带撕开空间，失败会把球权送回去。',
      successChance: chance(0.46 + attrs.dribbling * 0.003, 0.35, 0.75), ratingOnSuccess: 0.35, ratingOnFail: -0.25,
      extra: { moraleOnSuccess: 1, moraleOnFail: -0.5 },
    }),
  ]
}

function buildDuel({ player }: KindContext): KeyMomentOption[] {
  const attrs = player.attributes
  return [
    option({
      id: 'commit', labelZh: '贴身对抗', descriptionZh: '主动上抢能直接终结进攻，也可能被一步过掉。',
      successChance: chance(0.3 + attrs.defending * 0.004 + attrs.physical * 0.002, 0.25, 0.72), ratingOnSuccess: 0.55, ratingOnFail: -0.5,
      extra: { coachOnSuccess: 1, coachOnFail: -0.5, moraleOnSuccess: 1.5, moraleOnFail: -1 },
    }),
    option({
      id: 'contain', labelZh: '保持站位', descriptionZh: '不轻易出脚，把对手逼向边路。',
      successChance: chance(0.66 + attrs.defending * 0.002, 0.55, 0.85), ratingOnSuccess: 0.15, ratingOnFail: -0.15,
      extra: { coachOnSuccess: 0.3 },
    }),
    option({
      id: 'foul', labelZh: '战术犯规', descriptionZh: '用犯规终止反击，代价是可能吃牌。',
      successChance: chance(0.84, 0.7, 0.9), ratingOnSuccess: -0.2, ratingOnFail: -0.65,
      extra: { coachOnSuccess: 0.5, coachOnFail: -0.6, moraleOnSuccess: -0.5 },
    }),
  ]
}

function buildSave({ player }: KindContext): KeyMomentOption[] {
  const attrs = player.attributes
  return [
    option({
      id: 'reflex', labelZh: '飞身扑救', descriptionZh: '用反应速度赌一个不可思议的扑救。',
      successChance: chance(0.3 + attrs.goalkeeping * 0.005, 0.2, 0.78), ratingOnSuccess: 0.9, ratingOnFail: -0.7,
      extra: { coachOnSuccess: 1, moraleOnSuccess: 2, moraleOnFail: -1 },
    }),
    option({
      id: 'position', labelZh: '封住近角', descriptionZh: '先把角度封死，把难题交给对手。',
      successChance: chance(0.54 + attrs.goalkeeping * 0.003, 0.45, 0.82), ratingOnSuccess: 0.45, ratingOnFail: -0.5,
      extra: { coachOnSuccess: 0.4 },
    }),
    option({
      id: 'rush', labelZh: '出击干扰', descriptionZh: '扩大防守范围，但身后会留下空门。',
      successChance: chance(0.42 + attrs.goalkeeping * 0.002 + attrs.mental * 0.002, 0.3, 0.76), ratingOnSuccess: 0.6, ratingOnFail: -0.9,
      extra: { coachOnSuccess: 0.6, coachOnFail: -0.6 },
    }),
  ]
}

function buildClearance({ player }: KindContext): KeyMomentOption[] {
  const attrs = player.attributes
  return [
    option({
      id: 'hoof', labelZh: '大脚解围', descriptionZh: '把危险踢远，最务实的选择。',
      successChance: 0.9, ratingOnSuccess: 0.1, ratingOnFail: -0.05,
      extra: { coachOnSuccess: 0.2 },
    }),
    option({
      id: 'calm', labelZh: '控球出压', descriptionZh: '冷静地把球传出去，能换来教练的信任。',
      successChance: chance(0.4 + attrs.passing * 0.004, 0.3, 0.78), ratingOnSuccess: 0.4, ratingOnFail: -0.45,
      extra: { coachOnSuccess: 0.5, coachOnFail: -0.4 },
    }),
    option({
      id: 'shield', labelZh: '护球造犯规', descriptionZh: '用身体把对手挡在身后，争取定位球。',
      successChance: chance(0.68 + attrs.physical * 0.002, 0.55, 0.85), ratingOnSuccess: 0.2, ratingOnFail: -0.2,
      extra: {},
    }),
  ]
}

const OPTION_BUILDERS: Record<KeyMomentKind, (context: KindContext) => KeyMomentOption[]> = {
  bigChance: buildBigChance,
  penalty: buildPenalty,
  throughBall: buildThroughBall,
  duel: buildDuel,
  save: buildSave,
  clearance: buildClearance,
}

export const KIND_TITLES: Record<KeyMomentKind, string> = {
  bigChance: '禁区里的机会',
  penalty: '点球点前',
  throughBall: '中场的出球选择',
  duel: '防线前的对抗',
  save: '门前的考验',
  clearance: '禁区内的解围',
}

export const KIND_PROMPTS: Record<KeyMomentKind, string> = {
  bigChance: '球落到你脚下，禁区内只剩一次触球的空间。你准备怎么处理？',
  penalty: '裁判指向点球点。全场安静下来，你抱起球走向十二码。',
  throughBall: '队友前插，防线之间露出一条缝隙。球在你脚下。',
  duel: '对手带球向你逼近，身后就是禁区。你必须做出选择。',
  save: '对手在近距离起脚，你只有一瞬间判断方向。',
  clearance: '禁区里一片混乱，球正滚向危险区域。',
}

export function optionsFor(kind: KeyMomentKind, context: KindContext): KeyMomentOption[] {
  return OPTION_BUILDERS[kind](context)
}
