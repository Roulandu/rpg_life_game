import knownJson from '../../data/names/known.json'
import translitJson from '../../data/names/transliteration.json'

interface NamedEntity {
  name: string
  nameZh?: string
}

/** 常用译名表：原名（含「de Jong」这类多词姓氏）到既定中文名。 */
const KNOWN_TOKENS: Record<string, string> = knownJson.tokens
const SYLLABLES: Record<string, string> = translitJson.syllables
const LETTERS: Record<string, string> = translitJson.letters
const MAX_SYLLABLE_KEY = Math.max(...Object.keys(SYLLABLES).map((key) => key.length))

/** 汉字（含扩展 A 区与兼容表意区），用于判断姓名是否已经中文化。 */
const CJK_PATTERN = /[㐀-䶿一-鿿豈-﫿]/

const JOINER = '·'

export function hasCjk(value: string): boolean {
  return CJK_PATTERN.test(value)
}

/**
 * 界面与直播的唯一取名口：中文名优先，缺失时回落原名。
 * 原名仍用于存档 id、合同与导出文件名，不参与显示。
 */
export function displayName(entity: NamedEntity | undefined | null): string {
  if (!entity) return ''
  return entity.nameZh && entity.nameZh.length > 0 ? entity.nameZh : entity.name
}

/** 单段原名按最长音节前缀转写；非字母字符直接跳过，保证输出只含汉字。 */
function transliterate(token: string): string {
  const lowered = token.toLowerCase()
  const parts: string[] = []
  let index = 0
  while (index < lowered.length) {
    const room = Math.min(MAX_SYLLABLE_KEY, lowered.length - index)
    let consumed = 0
    for (let size = room; size >= 1; size -= 1) {
      const slice = lowered.slice(index, index + size)
      const hit = SYLLABLES[slice] ?? LETTERS[slice]
      if (hit) {
        parts.push(hit)
        consumed = size
        break
      }
    }
    index += consumed > 0 ? consumed : 1
  }
  return parts.join('')
}

function translateToken(token: string): string {
  return KNOWN_TOKENS[token] ?? transliterate(token)
}

/**
 * 生成中文名：已含汉字的姓名池（中国/日本/韩国）原样保留，不做反向拼音；
 * 拉丁名逐段查常用译名表，未命中走音节表，段间用间隔号连接。
 * 纯字符串运算：不消耗随机数、不读时钟，同输入必同输出。
 */
export function nameZhFor(name: string, nationality: string): string {
  if (hasCjk(name)) return name
  const tokens = name.split(/\s+/).filter((token) => token.length > 0)
  if (tokens.length === 0) return nationality
  const parts: string[] = []
  let index = 0
  while (index < tokens.length) {
    const pair = index + 1 < tokens.length ? `${tokens[index]} ${tokens[index + 1]}` : ''
    const pairHit = pair ? KNOWN_TOKENS[pair] : undefined
    if (pairHit) {
      parts.push(pairHit)
      index += 2
      continue
    }
    const single = translateToken(tokens[index] ?? '')
    parts.push(single.length > 0 ? single : transliterate(tokens[index] ?? ''))
    index += 1
  }
  return parts.join(JOINER)
}
