import type { KeyMomentOption } from '../../domain'
import { buildOptionTable, type KindContext, type OptionRow } from './scoreChance'

const bigChanceRows: OptionRow[] = [
  {
    id: 'shoot', labelZh: '直接射门', descriptionZh: '把握机会自己解决，角度被封堵时容易浪费。',
    base: 0.3, actor: { shooting: 0.004, mental: 0.0008 },
    opponent: { keeper: { goalkeeping: 0.0012 }, marker: { defending: 0.0006 } },
    low: 0.2, high: 0.74, ratingOnSuccess: 0.75, ratingOnFail: -0.35,
    extra: { goalOnSuccess: true, coachOnSuccess: 0.5, moraleOnSuccess: 2, moraleOnFail: -1 },
  },
  {
    id: 'square', labelZh: '横传队友', descriptionZh: '把球送到更好的位置，可能收获一次助攻。',
    base: 0.48, actor: { passing: 0.003 }, opponent: { marker: { pace: 0.0008 } },
    low: 0.4, high: 0.86, ratingOnSuccess: 0.45, ratingOnFail: -0.1,
    extra: { assistOnSuccess: true, coachOnSuccess: 0.4, moraleOnSuccess: 1.5 },
  },
  {
    id: 'hold', labelZh: '护球等待支援', descriptionZh: '几乎不会丢球，但很难制造直接威胁。',
    base: 0.92, low: 0.92, high: 0.92, flatBasisZh: '稳定的护球选择',
    ratingOnSuccess: 0.05, ratingOnFail: -0.05, extra: { moraleOnSuccess: 0.5 },
  },
  {
    id: 'chip', labelZh: '挑射吊门', descriptionZh: '门将站位靠前时，一脚挑射能越过他的头顶。',
    base: 0.34, actor: { technique: 0.003, mental: 0.0005 },
    opponent: { keeper: { goalkeeping: 0.0014, pace: 0.0006 } },
    low: 0.25, high: 0.7, ratingOnSuccess: 1, ratingOnFail: -0.6,
    extra: { goalOnSuccess: true, coachOnSuccess: 0.4, moraleOnSuccess: 2.5, moraleOnFail: -1.5 },
  },
  {
    id: 'flick', labelZh: '做球给插上队友', descriptionZh: '用一次轻巧的做球把防线彻底扯开。',
    base: 0.5, actor: { passing: 0.003 }, opponent: { marker: { defending: 0.001 } },
    low: 0.4, high: 0.85, ratingOnSuccess: 0.4, ratingOnFail: -0.15,
    extra: { assistOnSuccess: true, coachOnSuccess: 0.3, moraleOnSuccess: 1 },
  },
]

const throughBallRows: OptionRow[] = [
  {
    id: 'thread', labelZh: '直塞身后', descriptionZh: '最危险也最致命的选择，需要精准的脚法。',
    base: 0.34, actor: { passing: 0.004 },
    opponent: { marker: { defending: 0.0015, pace: 0.0006 } },
    low: 0.28, high: 0.72, ratingOnSuccess: 0.65, ratingOnFail: -0.4,
    extra: { assistOnSuccess: true, coachOnSuccess: 0.5, moraleOnSuccess: 2 },
  },
  {
    id: 'simple', labelZh: '分边转移', descriptionZh: '把球送到安全区域，保持球队的节奏。',
    base: 0.74, actor: { passing: 0.0015 }, low: 0.6, high: 0.9,
    ratingOnSuccess: 0.15, ratingOnFail: -0.1, extra: { coachOnSuccess: 0.2 },
  },
  {
    id: 'carry', labelZh: '自己带球推进', descriptionZh: '用盘带撕开空间，失败会把球权送回去。',
    base: 0.46, actor: { dribbling: 0.003 }, opponent: { marker: { defending: 0.0012 } },
    low: 0.35, high: 0.75, ratingOnSuccess: 0.35, ratingOnFail: -0.25,
    extra: { moraleOnSuccess: 1, moraleOnFail: -0.5 },
  },
  {
    id: 'overTop', labelZh: '过顶长传', descriptionZh: '越过整条防线，风险与回报都很高。',
    base: 0.3, actor: { passing: 0.004, technique: 0.001 },
    opponent: { marker: { physical: 0.0006 }, keeper: { pace: 0.0008 } },
    low: 0.25, high: 0.7, ratingOnSuccess: 0.7, ratingOnFail: -0.45,
    extra: { assistOnSuccess: true, coachOnSuccess: 0.4, moraleOnSuccess: 2, moraleOnFail: -1 },
  },
  {
    id: 'backPass', labelZh: '回做稳住节奏', descriptionZh: '把球交回后场，几乎不会冒险。',
    base: 0.82, low: 0.82, high: 0.82, flatBasisZh: '稳妥的回收选择',
    ratingOnSuccess: 0.1, ratingOnFail: -0.05, extra: { coachOnSuccess: 0.1 },
  },
]

const oneOnOneRows: OptionRow[] = [
  {
    id: 'round', labelZh: '晃过门将', descriptionZh: '把门将也过掉，再推射空门。',
    base: 0.3, actor: { dribbling: 0.003, technique: 0.002 },
    opponent: { keeper: { goalkeeping: 0.0014, pace: 0.0012 } },
    low: 0.22, high: 0.66, ratingOnSuccess: 1.2, ratingOnFail: -0.8,
    extra: {
      goalOnSuccess: true, coachOnSuccess: 0.6, coachOnFail: -0.5, moraleOnSuccess: 3, moraleOnFail: -2,
    },
  },
  {
    id: 'nearPost', labelZh: '近角爆射', descriptionZh: '抢在门将封堵前打近角。',
    base: 0.34, actor: { shooting: 0.004 }, opponent: { keeper: { goalkeeping: 0.0014 } },
    low: 0.25, high: 0.72, ratingOnSuccess: 0.9, ratingOnFail: -0.6,
    extra: { goalOnSuccess: true, coachOnSuccess: 0.5, moraleOnSuccess: 2.5, moraleOnFail: -1.5 },
  },
  {
    id: 'chipKeeper', labelZh: '轻巧挑射', descriptionZh: '门将扑倒的瞬间把球挑过他的身体。',
    base: 0.26, actor: { technique: 0.003, mental: 0.002 },
    opponent: { keeper: { goalkeeping: 0.001, mental: 0.0012 } },
    low: 0.18, high: 0.64, ratingOnSuccess: 1.3, ratingOnFail: -0.9,
    extra: { goalOnSuccess: true, coachOnSuccess: 0.4, moraleOnSuccess: 3.5, moraleOnFail: -2.5 },
  },
  {
    id: 'squareOne', labelZh: '横传空门', descriptionZh: '把门将引出来，再把球送到空门队友脚下。',
    base: 0.52, actor: { passing: 0.003 }, opponent: { keeper: { pace: 0.001 } },
    low: 0.42, high: 0.84, ratingOnSuccess: 0.6, ratingOnFail: -0.2,
    extra: { assistOnSuccess: true, coachOnSuccess: 0.45, moraleOnSuccess: 1.5 },
  },
  {
    id: 'wait', labelZh: '等待支援', descriptionZh: '先护住球，等队友跟上再决定。',
    base: 0.76, actor: { mental: 0.001 }, opponent: { marker: { pace: 0.0006 } },
    low: 0.62, high: 0.88, ratingOnSuccess: 0.1, ratingOnFail: -0.1,
    extra: { coachOnSuccess: 0.2, coachOnFail: -0.1 },
  },
]

const counterAttackRows: OptionRow[] = [
  {
    id: 'drive', labelZh: '带球狂奔', descriptionZh: '用速度直接冲击对手还没落位的防线。',
    base: 0.32, actor: { pace: 0.004, dribbling: 0.001 },
    opponent: { marker: { pace: 0.0012, defending: 0.0008 }, keeper: { goalkeeping: 0.0006 } },
    low: 0.24, high: 0.7, ratingOnSuccess: 0.8, ratingOnFail: -0.5,
    extra: { goalOnSuccess: true, coachOnSuccess: 0.4, moraleOnSuccess: 2, moraleOnFail: -1 },
  },
  {
    id: 'through', labelZh: '直塞前插', descriptionZh: '一脚穿透防线，让队友直接面对球门。',
    base: 0.36, actor: { passing: 0.004 }, opponent: { marker: { defending: 0.0014 } },
    low: 0.28, high: 0.74, ratingOnSuccess: 0.7, ratingOnFail: -0.45,
    extra: { assistOnSuccess: true, coachOnSuccess: 0.4, moraleOnSuccess: 1.5 },
  },
  {
    id: 'wide', labelZh: '分边快攻', descriptionZh: '把球转移到空当一侧，让反击继续滚动。',
    base: 0.62, actor: { passing: 0.002 }, opponent: { marker: { pace: 0.0008 } },
    low: 0.5, high: 0.85, ratingOnSuccess: 0.4, ratingOnFail: -0.15,
    extra: { assistOnSuccess: true, coachOnSuccess: 0.25 },
  },
  {
    id: 'shootEarly', labelZh: '提前远射', descriptionZh: '在防线合拢前直接起脚，打门将一个措手不及。',
    base: 0.18, actor: { shooting: 0.003 },
    opponent: { keeper: { goalkeeping: 0.0014, pace: 0.001 } },
    low: 0.1, high: 0.5, ratingOnSuccess: 0.9, ratingOnFail: -0.5,
    extra: { goalOnSuccess: true, coachOnSuccess: 0.3, moraleOnSuccess: 2.5, moraleOnFail: -1 },
  },
  {
    id: 'holdUpCounter', labelZh: '控住节奏', descriptionZh: '先稳一下，让全队压上再组织进攻。',
    base: 0.8, actor: { mental: 0.001 }, low: 0.65, high: 0.9,
    ratingOnSuccess: 0.1, ratingOnFail: -0.1, extra: { coachOnSuccess: 0.15 },
  },
]

const crossRows: OptionRow[] = [
  {
    id: 'earlyCross', labelZh: '提前传中', descriptionZh: '在防守球员落位前把球送进禁区。',
    base: 0.4, actor: { passing: 0.003 },
    opponent: { marker: { pace: 0.001, defending: 0.0006 } },
    low: 0.3, high: 0.78, ratingOnSuccess: 0.5, ratingOnFail: -0.2,
    extra: { assistOnSuccess: true, coachOnSuccess: 0.3 },
  },
  {
    id: 'cutBack', labelZh: '倒三角回传', descriptionZh: '下底后回敲点球点，制造最舒服的射门角度。',
    base: 0.34, actor: { passing: 0.003, technique: 0.001 },
    opponent: { marker: { defending: 0.0012, pace: 0.0008 } },
    low: 0.26, high: 0.74, ratingOnSuccess: 0.6, ratingOnFail: -0.25,
    extra: {
      assistOnSuccess: true, coachOnSuccess: 0.35, moraleOnSuccess: 1.5, moraleOnFail: -0.5,
    },
  },
  {
    id: 'whipped', labelZh: '弧线传中', descriptionZh: '用旋转把球送到门将和后卫之间。',
    base: 0.3, actor: { technique: 0.004 },
    opponent: { marker: { physical: 0.0006 }, keeper: { goalkeeping: 0.001 } },
    low: 0.22, high: 0.7, ratingOnSuccess: 0.55, ratingOnFail: -0.25,
    extra: { assistOnSuccess: true, coachOnSuccess: 0.3 },
  },
  {
    id: 'nearPostCross', labelZh: '前点低平球', descriptionZh: '把球扫向前点，让队友抢射。',
    base: 0.46, actor: { passing: 0.002 }, opponent: { marker: { defending: 0.0012 } },
    low: 0.36, high: 0.8, ratingOnSuccess: 0.4, ratingOnFail: -0.2,
    extra: { assistOnSuccess: true, coachOnSuccess: 0.25 },
  },
  {
    id: 'safeCross', labelZh: '回敲边后卫', descriptionZh: '放弃一次冒险传中，把球权留在队内。',
    base: 0.86, low: 0.86, high: 0.86, flatBasisZh: '稳妥的回收选择',
    ratingOnSuccess: 0.05, ratingOnFail: -0.05, extra: { coachOnSuccess: 0.1 },
  },
]

const longShotRows: OptionRow[] = [
  {
    id: 'topCorner', labelZh: '瞄准死角', descriptionZh: '用最刁钻的角度考验门将。',
    base: 0.14, actor: { shooting: 0.003, technique: 0.001 },
    opponent: { keeper: { goalkeeping: 0.0016, mental: 0.0004 } },
    low: 0.08, high: 0.46, ratingOnSuccess: 1.1, ratingOnFail: -0.35,
    extra: { goalOnSuccess: true, coachOnSuccess: 0.5, moraleOnSuccess: 3, moraleOnFail: -1 },
  },
  {
    id: 'powerLong', labelZh: '大力轰门', descriptionZh: '用力量迫使门将脱手。',
    base: 0.12, actor: { shooting: 0.002, physical: 0.001 },
    opponent: { keeper: { goalkeeping: 0.0014, physical: 0.0006 } },
    low: 0.07, high: 0.42, ratingOnSuccess: 0.9, ratingOnFail: -0.4,
    extra: { goalOnSuccess: true, coachOnSuccess: 0.35, moraleOnSuccess: 2, moraleOnFail: -1 },
  },
  {
    id: 'dip', labelZh: '电梯球', descriptionZh: '让球在门前突然下坠，门将很难判断。',
    base: 0.1, actor: { technique: 0.003 },
    opponent: { keeper: { goalkeeping: 0.0014, mental: 0.0008 } },
    low: 0.05, high: 0.38, ratingOnSuccess: 1.2, ratingOnFail: -0.4,
    extra: { goalOnSuccess: true, coachOnSuccess: 0.3, moraleOnSuccess: 3, moraleOnFail: -1 },
  },
  {
    id: 'deflect', labelZh: '打向人墙', descriptionZh: '把球踢向防守球员，争取折射或角球。',
    base: 0.5, actor: { shooting: 0.001 },
    opponent: { marker: { physical: 0.0012, defending: 0.0006 } },
    low: 0.4, high: 0.7, ratingOnSuccess: 0.1, ratingOnFail: -0.2,
    extra: { coachOnSuccess: 0.1 },
  },
  {
    id: 'recycle', labelZh: '回传重组', descriptionZh: '把球交回去，耐心寻找更好的机会。',
    base: 0.88, low: 0.88, high: 0.88, flatBasisZh: '稳妥的回收选择',
    ratingOnSuccess: 0.05, ratingOnFail: -0.05, extra: { coachOnSuccess: 0.1 },
  },
]

export function buildBigChance(context: KindContext): KeyMomentOption[] {
  return buildOptionTable(bigChanceRows, context)
}

export function buildThroughBall(context: KindContext): KeyMomentOption[] {
  return buildOptionTable(throughBallRows, context)
}

export function buildOneOnOne(context: KindContext): KeyMomentOption[] {
  return buildOptionTable(oneOnOneRows, context)
}

export function buildCounterAttack(context: KindContext): KeyMomentOption[] {
  return buildOptionTable(counterAttackRows, context)
}

export function buildCross(context: KindContext): KeyMomentOption[] {
  return buildOptionTable(crossRows, context)
}

export function buildLongShot(context: KindContext): KeyMomentOption[] {
  return buildOptionTable(longShotRows, context)
}
