import denylistJson from '../data/denylist/england.json'
import { COUNTRY_PACKS, NAME_POOLS, NATIONALITY_WEIGHTS } from '../src/world/datapack'
import { STARTING_CLUBS } from '../src/world/data/england'

const errors: string[] = []

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

const clubCount = COUNTRY_PACKS.reduce((sum, pack) => sum + pack.clubs.length, 0)
if (errors.length > 0) {
  console.error(`数据包校验失败（${errors.length} 项）：`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(
  `数据包校验通过：${COUNTRY_PACKS.length} 个国家、${clubCount} 家俱乐部、${seenLeagueIds.size} 个联赛、${Object.keys(NAME_POOLS).length} 个姓名池。`,
)
