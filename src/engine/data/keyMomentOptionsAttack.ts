import type { KeyMomentOption } from '../../domain'
import { attrBasis, chance, option, type KindContext } from './optionUtils'

export function buildBigChance({ player }: KindContext): KeyMomentOption[] {
  const attrs = player.attributes
  const mental = attrs.mental / 100
  return [
    option({
      id: 'shoot', labelZh: '直接射门', descriptionZh: '把握机会自己解决，角度被封堵时容易浪费。',
      successChance: chance(0.3 + attrs.shooting * 0.004 + mental * 0.08, 0.2, 0.74),
      successBasisZh: attrBasis(player, ['shooting', 'mental']),
      ratingOnSuccess: 0.75, ratingOnFail: -0.35,
      extra: { goalOnSuccess: true, coachOnSuccess: 0.5, moraleOnSuccess: 2, moraleOnFail: -1 },
    }),
    option({
      id: 'square', labelZh: '横传队友', descriptionZh: '把球送到更好的位置，可能收获一次助攻。',
      successChance: chance(0.48 + attrs.passing * 0.003, 0.4, 0.86),
      successBasisZh: attrBasis(player, ['passing']),
      ratingOnSuccess: 0.45, ratingOnFail: -0.1,
      extra: { assistOnSuccess: true, coachOnSuccess: 0.4, moraleOnSuccess: 1.5 },
    }),
    option({
      id: 'hold', labelZh: '护球等待支援', descriptionZh: '几乎不会丢球，但很难制造直接威胁。',
      successChance: 0.92,
      successBasisZh: '稳定的护球选择',
      ratingOnSuccess: 0.05, ratingOnFail: -0.05,
      extra: { moraleOnSuccess: 0.5 },
    }),
    option({
      id: 'chip', labelZh: '挑射吊门', descriptionZh: '门将站位靠前时，一脚挑射能越过他的头顶。',
      successChance: chance(0.34 + attrs.technique * 0.003 + mental * 0.05, 0.25, 0.7),
      successBasisZh: attrBasis(player, ['technique', 'mental']),
      ratingOnSuccess: 1, ratingOnFail: -0.6,
      extra: { goalOnSuccess: true, coachOnSuccess: 0.4, moraleOnSuccess: 2.5, moraleOnFail: -1.5 },
    }),
    option({
      id: 'flick', labelZh: '做球给插上队友', descriptionZh: '用一次轻巧的做球把防线彻底扯开。',
      successChance: chance(0.5 + attrs.passing * 0.003, 0.4, 0.85),
      successBasisZh: attrBasis(player, ['passing']),
      ratingOnSuccess: 0.4, ratingOnFail: -0.15,
      extra: { assistOnSuccess: true, coachOnSuccess: 0.3, moraleOnSuccess: 1 },
    }),
  ]
}

export function buildThroughBall({ player }: KindContext): KeyMomentOption[] {
  const attrs = player.attributes
  return [
    option({
      id: 'thread', labelZh: '直塞身后', descriptionZh: '最危险也最致命的选择，需要精准的脚法。',
      successChance: chance(0.34 + attrs.passing * 0.004, 0.28, 0.72),
      successBasisZh: attrBasis(player, ['passing']),
      ratingOnSuccess: 0.65, ratingOnFail: -0.4,
      extra: { assistOnSuccess: true, coachOnSuccess: 0.5, moraleOnSuccess: 2 },
    }),
    option({
      id: 'simple', labelZh: '分边转移', descriptionZh: '把球送到安全区域，保持球队的节奏。',
      successChance: chance(0.74 + attrs.passing * 0.0015, 0.6, 0.9),
      successBasisZh: attrBasis(player, ['passing']),
      ratingOnSuccess: 0.15, ratingOnFail: -0.1,
      extra: { coachOnSuccess: 0.2 },
    }),
    option({
      id: 'carry', labelZh: '自己带球推进', descriptionZh: '用盘带撕开空间，失败会把球权送回去。',
      successChance: chance(0.46 + attrs.dribbling * 0.003, 0.35, 0.75),
      successBasisZh: attrBasis(player, ['dribbling']),
      ratingOnSuccess: 0.35, ratingOnFail: -0.25,
      extra: { moraleOnSuccess: 1, moraleOnFail: -0.5 },
    }),
    option({
      id: 'overTop', labelZh: '过顶长传', descriptionZh: '越过整条防线，风险与回报都很高。',
      successChance: chance(0.3 + attrs.passing * 0.004 + attrs.technique * 0.001, 0.25, 0.7),
      successBasisZh: attrBasis(player, ['passing', 'technique']),
      ratingOnSuccess: 0.7, ratingOnFail: -0.45,
      extra: { assistOnSuccess: true, coachOnSuccess: 0.4, moraleOnSuccess: 2, moraleOnFail: -1 },
    }),
    option({
      id: 'backPass', labelZh: '回做稳住节奏', descriptionZh: '把球交回后场，几乎不会冒险。',
      successChance: 0.82,
      successBasisZh: '稳妥的回收选择',
      ratingOnSuccess: 0.1, ratingOnFail: -0.05,
      extra: { coachOnSuccess: 0.1 },
    }),
  ]
}

export function buildOneOnOne({ player }: KindContext): KeyMomentOption[] {
  const attrs = player.attributes
  return [
    option({
      id: 'round', labelZh: '晃过门将', descriptionZh: '把门将也过掉，再推射空门。',
      successChance: chance(0.3 + attrs.dribbling * 0.003 + attrs.technique * 0.002, 0.22, 0.66),
      successBasisZh: attrBasis(player, ['dribbling', 'technique']),
      ratingOnSuccess: 1.2, ratingOnFail: -0.8,
      extra: { goalOnSuccess: true, coachOnSuccess: 0.6, coachOnFail: -0.5, moraleOnSuccess: 3, moraleOnFail: -2 },
    }),
    option({
      id: 'nearPost', labelZh: '近角爆射', descriptionZh: '抢在门将封堵前打近角。',
      successChance: chance(0.34 + attrs.shooting * 0.004, 0.25, 0.72),
      successBasisZh: attrBasis(player, ['shooting']),
      ratingOnSuccess: 0.9, ratingOnFail: -0.6,
      extra: { goalOnSuccess: true, coachOnSuccess: 0.5, moraleOnSuccess: 2.5, moraleOnFail: -1.5 },
    }),
    option({
      id: 'chipKeeper', labelZh: '轻巧挑射', descriptionZh: '门将扑倒的瞬间把球挑过他的身体。',
      successChance: chance(0.26 + attrs.technique * 0.003 + attrs.mental * 0.002, 0.18, 0.64),
      successBasisZh: attrBasis(player, ['technique', 'mental']),
      ratingOnSuccess: 1.3, ratingOnFail: -0.9,
      extra: { goalOnSuccess: true, coachOnSuccess: 0.4, moraleOnSuccess: 3.5, moraleOnFail: -2.5 },
    }),
    option({
      id: 'squareOne', labelZh: '横传空门', descriptionZh: '把门将引出来，再把球送到空门队友脚下。',
      successChance: chance(0.52 + attrs.passing * 0.003, 0.42, 0.84),
      successBasisZh: attrBasis(player, ['passing']),
      ratingOnSuccess: 0.6, ratingOnFail: -0.2,
      extra: { assistOnSuccess: true, coachOnSuccess: 0.45, moraleOnSuccess: 1.5 },
    }),
    option({
      id: 'wait', labelZh: '等待支援', descriptionZh: '先护住球，等队友跟上再决定。',
      successChance: chance(0.76 + attrs.mental * 0.001, 0.62, 0.88),
      successBasisZh: attrBasis(player, ['mental']),
      ratingOnSuccess: 0.1, ratingOnFail: -0.1,
      extra: { coachOnSuccess: 0.2, coachOnFail: -0.1 },
    }),
  ]
}

export function buildCounterAttack({ player }: KindContext): KeyMomentOption[] {
  const attrs = player.attributes
  return [
    option({
      id: 'drive', labelZh: '带球狂奔', descriptionZh: '用速度直接冲击对手还没落位的防线。',
      successChance: chance(0.32 + attrs.pace * 0.004 + attrs.dribbling * 0.001, 0.24, 0.7),
      successBasisZh: attrBasis(player, ['pace', 'dribbling']),
      ratingOnSuccess: 0.8, ratingOnFail: -0.5,
      extra: { goalOnSuccess: true, coachOnSuccess: 0.4, moraleOnSuccess: 2, moraleOnFail: -1 },
    }),
    option({
      id: 'through', labelZh: '直塞前插', descriptionZh: '一脚穿透防线，让队友直接面对球门。',
      successChance: chance(0.36 + attrs.passing * 0.004, 0.28, 0.74),
      successBasisZh: attrBasis(player, ['passing']),
      ratingOnSuccess: 0.7, ratingOnFail: -0.45,
      extra: { assistOnSuccess: true, coachOnSuccess: 0.4, moraleOnSuccess: 1.5 },
    }),
    option({
      id: 'wide', labelZh: '分边快攻', descriptionZh: '把球转移到空当一侧，让反击继续滚动。',
      successChance: chance(0.62 + attrs.passing * 0.002, 0.5, 0.85),
      successBasisZh: attrBasis(player, ['passing']),
      ratingOnSuccess: 0.4, ratingOnFail: -0.15,
      extra: { assistOnSuccess: true, coachOnSuccess: 0.25 },
    }),
    option({
      id: 'shootEarly', labelZh: '提前远射', descriptionZh: '在防线合拢前直接起脚，打门将一个措手不及。',
      successChance: chance(0.18 + attrs.shooting * 0.003, 0.1, 0.5),
      successBasisZh: attrBasis(player, ['shooting']),
      ratingOnSuccess: 0.9, ratingOnFail: -0.5,
      extra: { goalOnSuccess: true, coachOnSuccess: 0.3, moraleOnSuccess: 2.5, moraleOnFail: -1 },
    }),
    option({
      id: 'holdUpCounter', labelZh: '控住节奏', descriptionZh: '先稳一下，让全队压上再组织进攻。',
      successChance: chance(0.8 + attrs.mental * 0.001, 0.65, 0.9),
      successBasisZh: attrBasis(player, ['mental']),
      ratingOnSuccess: 0.1, ratingOnFail: -0.1,
      extra: { coachOnSuccess: 0.15 },
    }),
  ]
}

export function buildCross({ player }: KindContext): KeyMomentOption[] {
  const attrs = player.attributes
  return [
    option({
      id: 'earlyCross', labelZh: '提前传中', descriptionZh: '在防守球员落位前把球送进禁区。',
      successChance: chance(0.4 + attrs.passing * 0.003, 0.3, 0.78),
      successBasisZh: attrBasis(player, ['passing']),
      ratingOnSuccess: 0.5, ratingOnFail: -0.2,
      extra: { assistOnSuccess: true, coachOnSuccess: 0.3 },
    }),
    option({
      id: 'cutBack', labelZh: '倒三角回传', descriptionZh: '下底后回敲点球点，制造最舒服的射门角度。',
      successChance: chance(0.34 + attrs.passing * 0.003 + attrs.technique * 0.001, 0.26, 0.74),
      successBasisZh: attrBasis(player, ['passing', 'technique']),
      ratingOnSuccess: 0.6, ratingOnFail: -0.25,
      extra: { assistOnSuccess: true, coachOnSuccess: 0.35, moraleOnSuccess: 1.5, moraleOnFail: -0.5 },
    }),
    option({
      id: 'whipped', labelZh: '弧线传中', descriptionZh: '用旋转把球送到门将和后卫之间。',
      successChance: chance(0.3 + attrs.technique * 0.004, 0.22, 0.7),
      successBasisZh: attrBasis(player, ['technique']),
      ratingOnSuccess: 0.55, ratingOnFail: -0.25,
      extra: { assistOnSuccess: true, coachOnSuccess: 0.3 },
    }),
    option({
      id: 'nearPostCross', labelZh: '前点低平球', descriptionZh: '把球扫向前点，让队友抢射。',
      successChance: chance(0.46 + attrs.passing * 0.002, 0.36, 0.8),
      successBasisZh: attrBasis(player, ['passing']),
      ratingOnSuccess: 0.4, ratingOnFail: -0.2,
      extra: { assistOnSuccess: true, coachOnSuccess: 0.25 },
    }),
    option({
      id: 'safeCross', labelZh: '回敲边后卫', descriptionZh: '放弃一次冒险传中，把球权留在队内。',
      successChance: 0.86,
      successBasisZh: '稳妥的回收选择',
      ratingOnSuccess: 0.05, ratingOnFail: -0.05,
      extra: { coachOnSuccess: 0.1 },
    }),
  ]
}

export function buildLongShot({ player }: KindContext): KeyMomentOption[] {
  const attrs = player.attributes
  return [
    option({
      id: 'topCorner', labelZh: '瞄准死角', descriptionZh: '用最刁钻的角度考验门将。',
      successChance: chance(0.14 + attrs.shooting * 0.003 + attrs.technique * 0.001, 0.08, 0.46),
      successBasisZh: attrBasis(player, ['shooting', 'technique']),
      ratingOnSuccess: 1.1, ratingOnFail: -0.35,
      extra: { goalOnSuccess: true, coachOnSuccess: 0.5, moraleOnSuccess: 3, moraleOnFail: -1 },
    }),
    option({
      id: 'powerLong', labelZh: '大力轰门', descriptionZh: '用力量迫使门将脱手。',
      successChance: chance(0.12 + attrs.shooting * 0.002 + attrs.physical * 0.001, 0.07, 0.42),
      successBasisZh: attrBasis(player, ['shooting', 'physical']),
      ratingOnSuccess: 0.9, ratingOnFail: -0.4,
      extra: { goalOnSuccess: true, coachOnSuccess: 0.35, moraleOnSuccess: 2, moraleOnFail: -1 },
    }),
    option({
      id: 'dip', labelZh: '电梯球', descriptionZh: '让球在门前突然下坠，门将很难判断。',
      successChance: chance(0.1 + attrs.technique * 0.003, 0.05, 0.38),
      successBasisZh: attrBasis(player, ['technique']),
      ratingOnSuccess: 1.2, ratingOnFail: -0.4,
      extra: { goalOnSuccess: true, coachOnSuccess: 0.3, moraleOnSuccess: 3, moraleOnFail: -1 },
    }),
    option({
      id: 'deflect', labelZh: '打向人墙', descriptionZh: '把球踢向防守球员，争取折射或角球。',
      successChance: chance(0.5 + attrs.shooting * 0.001, 0.4, 0.7),
      successBasisZh: attrBasis(player, ['shooting']),
      ratingOnSuccess: 0.1, ratingOnFail: -0.2,
      extra: { coachOnSuccess: 0.1 },
    }),
    option({
      id: 'recycle', labelZh: '回传重组', descriptionZh: '把球交回去，耐心寻找更好的机会。',
      successChance: 0.88,
      successBasisZh: '稳妥的回收选择',
      ratingOnSuccess: 0.05, ratingOnFail: -0.05,
      extra: { coachOnSuccess: 0.1 },
    }),
  ]
}
