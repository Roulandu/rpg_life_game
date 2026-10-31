import type { KeyMomentOption } from '../../domain'
import { attrBasis, chance, option, type KindContext } from './optionUtils'

export function buildDuel({ player }: KindContext): KeyMomentOption[] {
  const attrs = player.attributes
  return [
    option({
      id: 'commit', labelZh: '贴身对抗', descriptionZh: '主动上抢能直接终结进攻，也可能被一步过掉。',
      successChance: chance(0.3 + attrs.defending * 0.004 + attrs.physical * 0.002, 0.25, 0.72),
      successBasisZh: attrBasis(player, ['defending', 'physical']),
      ratingOnSuccess: 0.55, ratingOnFail: -0.5,
      extra: { coachOnSuccess: 1, coachOnFail: -0.5, moraleOnSuccess: 1.5, moraleOnFail: -1 },
    }),
    option({
      id: 'contain', labelZh: '保持站位', descriptionZh: '不轻易出脚，把对手逼向边路。',
      successChance: chance(0.66 + attrs.defending * 0.002, 0.55, 0.85),
      successBasisZh: attrBasis(player, ['defending']),
      ratingOnSuccess: 0.15, ratingOnFail: -0.15,
      extra: { coachOnSuccess: 0.3 },
    }),
    option({
      id: 'foul', labelZh: '战术犯规', descriptionZh: '用犯规终止反击，代价是可能吃牌。',
      successChance: chance(0.84, 0.7, 0.9),
      successBasisZh: '高成功率的犯规选择',
      ratingOnSuccess: -0.2, ratingOnFail: -0.65,
      extra: { coachOnSuccess: 0.5, coachOnFail: -0.6, moraleOnSuccess: -0.5 },
    }),
    option({
      id: 'shoulder', labelZh: '侧身卡位', descriptionZh: '用身体把对手挤开，干净地拿回球权。',
      successChance: chance(0.5 + attrs.physical * 0.003, 0.4, 0.82),
      successBasisZh: attrBasis(player, ['physical']),
      ratingOnSuccess: 0.3, ratingOnFail: -0.3,
      extra: { coachOnSuccess: 0.5, moraleOnSuccess: 0.8, moraleOnFail: -0.5 },
    }),
    option({
      id: 'drop', labelZh: '回撤保护', descriptionZh: '不冒险上抢，退到防线前等待支援。',
      successChance: chance(0.78 + attrs.defending * 0.001, 0.65, 0.9),
      successBasisZh: attrBasis(player, ['defending']),
      ratingOnSuccess: 0.05, ratingOnFail: -0.1,
      extra: { coachOnSuccess: 0.15 },
    }),
  ]
}

export function buildSave({ player }: KindContext): KeyMomentOption[] {
  const attrs = player.attributes
  return [
    option({
      id: 'reflex', labelZh: '飞身扑救', descriptionZh: '用反应速度赌一个不可思议的扑救。',
      successChance: chance(0.3 + attrs.goalkeeping * 0.005, 0.2, 0.78),
      successBasisZh: attrBasis(player, ['goalkeeping']),
      ratingOnSuccess: 0.9, ratingOnFail: -0.7,
      extra: { coachOnSuccess: 1, moraleOnSuccess: 2, moraleOnFail: -1 },
    }),
    option({
      id: 'position', labelZh: '封住近角', descriptionZh: '先把角度封死，把难题交给对手。',
      successChance: chance(0.54 + attrs.goalkeeping * 0.003, 0.45, 0.82),
      successBasisZh: attrBasis(player, ['goalkeeping']),
      ratingOnSuccess: 0.45, ratingOnFail: -0.5,
      extra: { coachOnSuccess: 0.4 },
    }),
    option({
      id: 'rush', labelZh: '出击干扰', descriptionZh: '扩大防守范围，但身后会留下空门。',
      successChance: chance(0.42 + attrs.goalkeeping * 0.002 + attrs.mental * 0.002, 0.3, 0.76),
      successBasisZh: attrBasis(player, ['goalkeeping', 'mental']),
      ratingOnSuccess: 0.6, ratingOnFail: -0.9,
      extra: { coachOnSuccess: 0.6, coachOnFail: -0.6 },
    }),
    option({
      id: 'punch', labelZh: '双拳击出', descriptionZh: '把球直接打向安全区域，不给对手补射机会。',
      successChance: chance(0.6 + attrs.goalkeeping * 0.003, 0.5, 0.86),
      successBasisZh: attrBasis(player, ['goalkeeping']),
      ratingOnSuccess: 0.5, ratingOnFail: -0.4,
      extra: { coachOnSuccess: 0.5, moraleOnSuccess: 1 },
    }),
    option({
      id: 'sweeper', labelZh: '出击清球', descriptionZh: '主动离开球门，把危险扼杀在形成射门前。',
      successChance: chance(0.36 + attrs.goalkeeping * 0.002 + attrs.mental * 0.002, 0.28, 0.72),
      successBasisZh: attrBasis(player, ['goalkeeping', 'mental']),
      ratingOnSuccess: 0.55, ratingOnFail: -0.8,
      extra: { coachOnSuccess: 0.5, coachOnFail: -0.5, moraleOnSuccess: 1.5, moraleOnFail: -1.5 },
    }),
  ]
}

export function buildClearance({ player }: KindContext): KeyMomentOption[] {
  const attrs = player.attributes
  return [
    option({
      id: 'hoof', labelZh: '大脚解围', descriptionZh: '把危险踢远，最务实的选择。',
      successChance: 0.9,
      successBasisZh: '最务实的解围方式',
      ratingOnSuccess: 0.1, ratingOnFail: -0.05,
      extra: { coachOnSuccess: 0.2 },
    }),
    option({
      id: 'calm', labelZh: '控球出压', descriptionZh: '冷静地把球传出去，能换来教练的信任。',
      successChance: chance(0.4 + attrs.passing * 0.004, 0.3, 0.78),
      successBasisZh: attrBasis(player, ['passing']),
      ratingOnSuccess: 0.4, ratingOnFail: -0.45,
      extra: { coachOnSuccess: 0.5, coachOnFail: -0.4 },
    }),
    option({
      id: 'shield', labelZh: '护球造犯规', descriptionZh: '用身体把对手挡在身后，争取定位球。',
      successChance: chance(0.68 + attrs.physical * 0.002, 0.55, 0.85),
      successBasisZh: attrBasis(player, ['physical']),
      ratingOnSuccess: 0.2, ratingOnFail: -0.2,
      extra: {},
    }),
    option({
      id: 'touchline', labelZh: '踢向边线', descriptionZh: '把球处理到远离球门的区域，降低风险。',
      successChance: 0.86,
      successBasisZh: '低压力的处理方式',
      ratingOnSuccess: 0.05, ratingOnFail: -0.05,
      extra: { coachOnSuccess: 0.1 },
    }),
    option({
      id: 'turn', labelZh: '转身摆脱', descriptionZh: '在禁区内冒险转身，成功就能直接发动反击。',
      successChance: chance(0.32 + attrs.dribbling * 0.004, 0.25, 0.72),
      successBasisZh: attrBasis(player, ['dribbling']),
      ratingOnSuccess: 0.5, ratingOnFail: -0.7,
      extra: { coachOnSuccess: 0.4, coachOnFail: -0.5, moraleOnSuccess: 1.5, moraleOnFail: -1.5 },
    }),
  ]
}

export function buildHeaderDuel({ player }: KindContext): KeyMomentOption[] {
  const attrs = player.attributes
  return [
    option({
      id: 'jump', labelZh: '抢前点争顶', descriptionZh: '抢在对手之前起跳，把球顶向球门。',
      successChance: chance(0.32 + attrs.physical * 0.004 + attrs.mental * 0.001, 0.25, 0.7),
      successBasisZh: attrBasis(player, ['physical', 'mental']),
      ratingOnSuccess: 0.7, ratingOnFail: -0.4,
      extra: { goalOnSuccess: true, coachOnSuccess: 0.8, moraleOnSuccess: 2, moraleOnFail: -1 },
    }),
    option({
      id: 'flick', labelZh: '头球摆渡', descriptionZh: '把球顶到更有威胁的位置，交给队友完成最后一击。',
      successChance: chance(0.5 + attrs.physical * 0.002 + attrs.passing * 0.001, 0.4, 0.8),
      successBasisZh: attrBasis(player, ['physical', 'passing']),
      ratingOnSuccess: 0.4, ratingOnFail: -0.15,
      extra: { assistOnSuccess: true, coachOnSuccess: 0.5, moraleOnSuccess: 1 },
    }),
    option({
      id: 'block', labelZh: '贴身干扰', descriptionZh: '不让对手舒服起跳，把争顶变成消耗战。',
      successChance: chance(0.6 + attrs.defending * 0.002 + attrs.mental * 0.001, 0.5, 0.85),
      successBasisZh: attrBasis(player, ['defending', 'mental']),
      ratingOnSuccess: 0.2, ratingOnFail: -0.2,
      extra: { coachOnSuccess: 0.4, moraleOnSuccess: 0.5, moraleOnFail: -0.5 },
    }),
    option({
      id: 'clearHeader', labelZh: '头球解围', descriptionZh: '把球顶出禁区，优先保证防线安全。',
      successChance: chance(0.78 + attrs.defending * 0.001, 0.65, 0.9),
      successBasisZh: attrBasis(player, ['defending']),
      ratingOnSuccess: 0.1, ratingOnFail: -0.05,
      extra: { coachOnSuccess: 0.3 },
    }),
    option({
      id: 'holdUp', labelZh: '护住落点', descriptionZh: '卡住位置等球落下，避免冒顶失位。',
      successChance: 0.82,
      successBasisZh: '稳妥的站位选择',
      ratingOnSuccess: 0.05, ratingOnFail: -0.1,
      extra: { coachOnSuccess: 0.1 },
    }),
  ]
}
