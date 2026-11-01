import denylistJson from '../data/denylist/england.json'
import knownNamesJson from '../data/names/known.json'
import transliterationJson from '../data/names/transliteration.json'
import { EVENT_TEMPLATES, hasCjk, nameZhFor } from '../src/domain'
import { COUNTRY_PACKS, NAME_POOLS, NATIONALITY_WEIGHTS } from '../src/world/datapack'
import { STARTING_CLUBS } from '../src/world/data/england'

const errors: string[] = []
const LATIN = /[A-Za-z]/

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0]
    previous[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const temp = previous[j]
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
      diagonal = temp
    }
  }
  return previous[b.length]
}

const seenClubIds = new Set<string>()
const seenClubNames = new Set<string>()
const seenLeagueIds = new Set<string>()
const clubIds = new Set<string>()

for (const pack of COUNTRY_PACKS) {
  const leaguesByTier = new Map(pack.leagues.map((league) => [league.tier, league]))

  for (const league of pack.leagues) {
    if (seenLeagueIds.has(league.id)) errors.push(`联赛 ID 重复：${league.id}`)
    seenLeagueIds.add(league.id)
    if (league.promotionSlots > 0 && league.relegationSlots > 0) {
      errors.push(`联赛 ${league.id} 同时设置了升级与降级名额`)
    }
  }

  for (const club of pack.clubs) {
    if (seenClubIds.has(club.id)) errors.push(`俱乐部 ID 重复：${club.id}`)
    seenClubIds.add(club.id)
    clubIds.add(club.id)

    const nameKey = `${normalize(club.nameEn)}|${club.nameZh}`
    if (seenClubNames.has(nameKey)) errors.push(`俱乐部名称重复：${club.nameZh}`)
    seenClubNames.add(nameKey)

    if (!leaguesByTier.has(club.tier)) {
      errors.push(`俱乐部 ${club.id} 找不到 tier ${club.tier} 的联赛`)
    }
    if (club.reputation < 1 || club.reputation > 100) {
      errors.push(`俱乐部 ${club.id} 声望超出 1–100`)
    }
    if (!club.id.startsWith(`club:${pack.code}:`)) {
      errors.push(`俱乐部 ${club.id} 的国家代码与数据包 ${pack.code} 不一致`)
    }
    if (!pack.namePools[pack.nameZh]) {
      errors.push(`数据包 ${pack.code} 缺少本国姓名池`)
    }
  }

  for (const denylistName of denylistJson.clubs) {
    const target = normalize(denylistName)
    for (const club of pack.clubs) {
      const candidate = normalize(club.nameEn)
      if (candidate === target) {
        errors.push(`俱乐部名与真实球队相同：${club.nameEn}（${denylistName}）`)
      } else if (target.length >= 12 && candidate.length >= 12 && levenshtein(candidate, target) <= 1) {
        errors.push(`俱乐部名与真实球队过于接近：${club.nameEn}（${denylistName}）`)
      }
    }
  }

  const tiers = new Set(pack.clubs.map((club) => club.tier))
  for (const league of pack.leagues) {
    const count = pack.clubs.filter((club) => club.tier === league.tier).length
    if (!tiers.has(league.tier)) errors.push(`联赛 ${league.id} 没有球队`)
    if (count < 2) errors.push(`联赛 ${league.id} 球队过少：${count}`)
  }
}

for (const weight of NATIONALITY_WEIGHTS) {
  if (weight.weight <= 0) errors.push(`国籍权重必须为正：${weight.value}`)
  if (!NAME_POOLS[weight.value]) errors.push(`缺少姓名池：${weight.value}`)
}

for (const club of STARTING_CLUBS) {
  if (!clubIds.has(club.id)) errors.push(`可选起点不存在：${club.id}`)
}

/** 人名表：姓名池每个词条都必须能给出纯汉字中文名，且命中常用译名表。 */
const knownTokens = knownNamesJson.tokens as Record<string, string>
for (const [nationality, pool] of Object.entries(NAME_POOLS)) {
  for (const token of [...pool.first, ...pool.last]) {
    const localized = nameZhFor(token, nationality)
    if (!hasCjk(localized)) errors.push(`中文名转写为空：${nationality} / ${token}`)
    if (LATIN.test(localized)) errors.push(`中文名残留拉丁字母：${nationality} / ${token} → ${localized}`)
    if (!LATIN.test(token)) continue
    const known = knownTokens[token]
    if (!known) errors.push(`姓名池词条缺少常用译名：${token}`)
    else if (known !== localized) errors.push(`常用译名与转写结果不一致：${token} → ${known} / ${localized}`)
  }
}

for (const [token, value] of Object.entries(knownTokens)) {
  if (LATIN.test(value)) errors.push(`常用译名表残留拉丁字母：${token} → ${value}`)
}
for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
  const value = (transliterationJson.letters as Record<string, string>)[letter]
  if (!value) errors.push(`字母转写表缺少字母：${letter}`)
  else if (!hasCjk(value)) errors.push(`字母转写结果不是汉字：${letter} → ${value}`)
}

/**
 * 事件数据包：条件字段必须在白名单内（domain 加载时已硬校验），
 * 这里补语义校验——标题不能残留拉丁字母、结果文案必须指向真实选项。
 */
const seenTemplateIds = new Set<string>()
for (const template of EVENT_TEMPLATES) {
  if (seenTemplateIds.has(template.id)) errors.push(`事件模板 id 重复：${template.id}`)
  seenTemplateIds.add(template.id)
  if (LATIN.test(template.title)) errors.push(`事件标题残留拉丁字母：${template.id} → ${template.title}`)
  if (template.guaranteed && template.when.length === 0) {
    errors.push(`保证型事件必须带条件，否则每天都会触发：${template.id}`)
  }
  const choiceIds = new Set(template.choices.map((choice) => choice.id))
  for (const key of Object.keys(template.resultTexts ?? {})) {
    if (!choiceIds.has(key)) errors.push(`事件 ${template.id} 的结果文案指向不存在的选项：${key}`)
  }
}

const clubCount = COUNTRY_PACKS.reduce((sum, pack) => sum + pack.clubs.length, 0)
if (errors.length > 0) {
  console.error(`数据包校验失败（${errors.length} 项）：`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(
  `数据包校验通过：${COUNTRY_PACKS.length} 个国家、${clubCount} 家俱乐部、${seenLeagueIds.size} 个联赛、${Object.keys(NAME_POOLS).length} 个姓名池、${EVENT_TEMPLATES.length} 个事件模板。`,
)
