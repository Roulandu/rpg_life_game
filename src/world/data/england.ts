import type { Club } from '../../domain/types'
import { COUNTRY_PACKS } from '../datapack'

export type ClubStyle = Club['style']
export type { ClubSeed, LeagueSeed } from '../datapack'
export { NAME_POOLS, NATIONALITY_WEIGHTS } from '../datapack'

const englandPack = COUNTRY_PACKS[0]

export const ENGLAND_CLUBS = englandPack.clubs
export const ENGLAND_LEAGUES = englandPack.leagues

export const STARTING_CLUBS = [
  {
    id: 'club:ENG:2:01',
    name: '伦敦竞技',
    description: '升级热门，阵容深度好，年轻人需要证明自己。',
    difficulty: '困难',
    expectation: '争夺升级',
  },
  {
    id: 'club:ENG:2:04',
    name: '伯明翰联',
    description: '中游球队，竞争适中，适合稳步成长。',
    difficulty: '普通',
    expectation: '联赛中游',
  },
  {
    id: 'club:ENG:2:20',
    name: '普雷斯顿工厂',
    description: '保级队，机会更多，但平台和资源有限。',
    difficulty: '简单',
    expectation: '保级',
  },
]

