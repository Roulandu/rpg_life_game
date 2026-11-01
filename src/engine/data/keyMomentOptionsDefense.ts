import type { KeyMomentOption } from '../../domain'
import { buildOptionTable, type KindContext, type OptionRow } from './scoreChance'

const duelRows: OptionRow[] = [
  {
    id: 'commit', labelZh: '贴身对抗', descriptionZh: '主动上抢能直接终结进攻，也可能被一步过掉。',
    base: 0.3, actor: { defending: 0.004, physical: 0.002 },
    opponent: { shooter: { dribbling: 0.002, pace: 0.0006 } },
    low: 0.25, high: 0.72, ratingOnSuccess: 0.55, ratingOnFail: -0.5,
    extra: { coachOnSuccess: 1, coachOnFail: -0.5, moraleOnSuccess: 1.5, moraleOnFail: -1 },
  },
  {
    id: 'contain', labelZh: '保持站位', descriptionZh: '不轻易出脚，把对手逼向边路。',
    base: 0.66, actor: { defending: 0.002 }, opponent: { shooter: { dribbling: 0.001 } },
    low: 0.55, high: 0.85, ratingOnSuccess: 0.15, ratingOnFail: -0.15,
    extra: { coachOnSuccess: 0.3 },
  },
  {
    id: 'foul', labelZh: '战术犯规', descriptionZh: '用犯规终止反击，代价是可能吃牌。',
    base: 0.84, low: 0.84, high: 0.84, flatBasisZh: '高成功率的犯规选择',
    ratingOnSuccess: -0.2, ratingOnFail: -0.65,
    extra: { coachOnSuccess: 0.5, coachOnFail: -0.6, moraleOnSuccess: -0.5 },
  },
  {
    id: 'shoulder', labelZh: '侧身卡位', descriptionZh: '用身体把对手挤开，干净地拿回球权。',
    base: 0.5, actor: { physical: 0.003 },
    opponent: { shooter: { physical: 0.0016, pace: 0.0008 } },
    low: 0.4, high: 0.82, ratingOnSuccess: 0.3, ratingOnFail: -0.3,
    extra: { coachOnSuccess: 0.5, moraleOnSuccess: 0.8, moraleOnFail: -0.5 },
  },
  {
    id: 'drop', labelZh: '回撤保护', descriptionZh: '不冒险上抢，退到防线前等待支援。',
    base: 0.78, actor: { defending: 0.001 }, opponent: { shooter: { pace: 0.0006 } },
    low: 0.65, high: 0.9, ratingOnSuccess: 0.05, ratingOnFail: -0.1,
    extra: { coachOnSuccess: 0.15 },
  },
]

const saveRows: OptionRow[] = [
  {
    id: 'reflex', labelZh: '飞身扑救', descriptionZh: '用反应速度赌一个不可思议的扑救。',
    base: 0.3, actor: { goalkeeping: 0.005 },
    opponent: { shooter: { shooting: 0.002, technique: 0.0006 } },
    low: 0.2, high: 0.78, ratingOnSuccess: 0.9, ratingOnFail: -0.7,
    extra: { coachOnSuccess: 1, moraleOnSuccess: 2, moraleOnFail: -1 },
  },
  {
    id: 'position', labelZh: '封住近角', descriptionZh: '先把角度封死，把难题交给对手。',
    base: 0.54, actor: { goalkeeping: 0.003 }, opponent: { shooter: { shooting: 0.0014 } },
    low: 0.45, high: 0.82, ratingOnSuccess: 0.45, ratingOnFail: -0.5,
    extra: { coachOnSuccess: 0.4 },
  },
  {
    id: 'rush', labelZh: '出击干扰', descriptionZh: '扩大防守范围，但身后会留下空门。',
    base: 0.42, actor: { goalkeeping: 0.002, mental: 0.002 },
    opponent: { shooter: { pace: 0.0012, dribbling: 0.0008 } },
    low: 0.3, high: 0.76, ratingOnSuccess: 0.6, ratingOnFail: -0.9,
    extra: { coachOnSuccess: 0.6, coachOnFail: -0.6 },
  },
  {
    id: 'punch', labelZh: '双拳击出', descriptionZh: '把球直接打向安全区域，不给对手补射机会。',
    base: 0.6, actor: { goalkeeping: 0.003 }, opponent: { shooter: { physical: 0.0012 } },
    low: 0.5, high: 0.86, ratingOnSuccess: 0.5, ratingOnFail: -0.4,
    extra: { coachOnSuccess: 0.5, moraleOnSuccess: 1 },
  },
  {
    id: 'sweeper', labelZh: '出击清球', descriptionZh: '主动离开球门，把危险扼杀在形成射门前。',
    base: 0.36, actor: { goalkeeping: 0.002, mental: 0.002 },
    opponent: { shooter: { pace: 0.0016, technique: 0.0008 } },
    low: 0.28, high: 0.72, ratingOnSuccess: 0.55, ratingOnFail: -0.8,
    extra: {
      coachOnSuccess: 0.5, coachOnFail: -0.5, moraleOnSuccess: 1.5, moraleOnFail: -1.5,
    },
  },
]

const clearanceRows: OptionRow[] = [
  {
    id: 'hoof', labelZh: '大脚解围', descriptionZh: '把危险踢远，最务实的选择。',
    base: 0.9, low: 0.9, high: 0.9, flatBasisZh: '最务实的解围方式',
    ratingOnSuccess: 0.1, ratingOnFail: -0.05, extra: { coachOnSuccess: 0.2 },
  },
  {
    id: 'calm', labelZh: '控球出压', descriptionZh: '冷静地把球传出去，能换来教练的信任。',
    base: 0.4, actor: { passing: 0.004 },
    opponent: { shooter: { pace: 0.001, physical: 0.0008 } },
    low: 0.3, high: 0.78, ratingOnSuccess: 0.4, ratingOnFail: -0.45,
    extra: { coachOnSuccess: 0.5, coachOnFail: -0.4 },
  },
  {
    id: 'shield', labelZh: '护球造犯规', descriptionZh: '用身体把对手挡在身后，争取定位球。',
    base: 0.68, actor: { physical: 0.002 }, opponent: { shooter: { physical: 0.0014 } },
    low: 0.55, high: 0.85, ratingOnSuccess: 0.2, ratingOnFail: -0.2, extra: {},
  },
  {
    id: 'touchline', labelZh: '踢向边线', descriptionZh: '把球处理到远离球门的区域，降低风险。',
    base: 0.86, low: 0.86, high: 0.86, flatBasisZh: '低压力的处理方式',
    ratingOnSuccess: 0.05, ratingOnFail: -0.05, extra: { coachOnSuccess: 0.1 },
  },
  {
    id: 'turn', labelZh: '转身摆脱', descriptionZh: '在禁区内冒险转身，成功就能直接发动反击。',
    base: 0.32, actor: { dribbling: 0.004 },
    opponent: { shooter: { pace: 0.0012, defending: 0.0006 } },
    low: 0.25, high: 0.72, ratingOnSuccess: 0.5, ratingOnFail: -0.7,
    extra: { coachOnSuccess: 0.4, coachOnFail: -0.5, moraleOnSuccess: 1.5, moraleOnFail: -1.5 },
  },
]

const headerDuelRows: OptionRow[] = [
  {
    id: 'jump', labelZh: '抢前点争顶', descriptionZh: '抢在对手之前起跳，把球顶向球门。',
    base: 0.32, actor: { physical: 0.004, mental: 0.001 },
    opponent: { shooter: { physical: 0.0016, pace: 0.0004 } },
    low: 0.25, high: 0.7, ratingOnSuccess: 0.7, ratingOnFail: -0.4,
    extra: { goalOnSuccess: true, coachOnSuccess: 0.8, moraleOnSuccess: 2, moraleOnFail: -1 },
  },
  {
    id: 'flick', labelZh: '头球摆渡', descriptionZh: '把球顶到更有威胁的位置，交给队友完成最后一击。',
    base: 0.5, actor: { physical: 0.002, passing: 0.001 },
    opponent: { shooter: { physical: 0.001 } },
    low: 0.4, high: 0.8, ratingOnSuccess: 0.4, ratingOnFail: -0.15,
    extra: { assistOnSuccess: true, coachOnSuccess: 0.5, moraleOnSuccess: 1 },
  },
  {
    id: 'block', labelZh: '贴身干扰', descriptionZh: '不让对手舒服起跳，把争顶变成消耗战。',
    base: 0.6, actor: { defending: 0.002, mental: 0.001 },
    opponent: { shooter: { physical: 0.0014 } },
    low: 0.5, high: 0.85, ratingOnSuccess: 0.2, ratingOnFail: -0.2,
    extra: { coachOnSuccess: 0.4, moraleOnSuccess: 0.5, moraleOnFail: -0.5 },
  },
  {
    id: 'clearHeader', labelZh: '头球解围', descriptionZh: '把球顶出禁区，优先保证防线安全。',
    base: 0.78, actor: { defending: 0.001 }, opponent: { shooter: { physical: 0.001 } },
    low: 0.65, high: 0.9, ratingOnSuccess: 0.1, ratingOnFail: -0.05,
    extra: { coachOnSuccess: 0.3 },
  },
  {
    id: 'holdUp', labelZh: '护住落点', descriptionZh: '卡住位置等球落下，避免冒顶失位。',
    base: 0.82, low: 0.82, high: 0.82, flatBasisZh: '稳妥的站位选择',
    ratingOnSuccess: 0.05, ratingOnFail: -0.1, extra: { coachOnSuccess: 0.1 },
  },
]

export function buildDuel(context: KindContext): KeyMomentOption[] {
  return buildOptionTable(duelRows, context)
}

export function buildSave(context: KindContext): KeyMomentOption[] {
  return buildOptionTable(saveRows, context)
}

export function buildClearance(context: KindContext): KeyMomentOption[] {
  return buildOptionTable(clearanceRows, context)
}

export function buildHeaderDuel(context: KindContext): KeyMomentOption[] {
  return buildOptionTable(headerDuelRows, context)
}
