export function cyrb128(input: string): [number, number, number, number] {
  let h1 = 1779033703
  let h2 = 3144134277
  let h3 = 1013904242
  let h4 = 2773480762
  for (let i = 0; i < input.length; i += 1) {
    const k = input.charCodeAt(i)
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067)
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233)
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213)
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179)
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067)
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233)
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213)
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179)
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0]
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export class Rng {
  private readonly nextValue: () => number

  constructor(seed: number | string) {
    const numericSeed = typeof seed === 'number' ? seed : cyrb128(seed)[0]
    this.nextValue = mulberry32(numericSeed)
  }

  next(): number {
    return this.nextValue()
  }

  float(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  int(min: number, max: number): number {
    const low = Math.ceil(min)
    const high = Math.floor(max)
    return Math.floor(this.next() * (high - low + 1)) + low
  }

  chance(probability: number): boolean {
    return this.next() < probability
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Cannot pick from an empty array')
    return items[Math.floor(this.next() * items.length)] as T
  }

  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items]
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.next() * (i + 1))
      const tmp = copy[i] as T
      copy[i] = copy[j] as T
      copy[j] = tmp
    }
    return copy
  }

  weighted<T>(items: readonly { value: T; weight: number }[]): T {
    const total = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0)
    if (total <= 0) {
      if (items.length === 0) throw new Error('Cannot pick from an empty weighted array')
      return items[0].value
    }
    let roll = this.next() * total
    for (const item of items) {
      roll -= Math.max(0, item.weight)
      if (roll <= 0) return item.value
    }
    return items[items.length - 1].value
  }

  normal(mean = 0, stdDev = 1): number {
    let u1 = this.next()
    if (u1 < 1e-12) u1 = 1e-12
    const u2 = this.next()
    return mean + stdDev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  }

  poisson(lambda: number): number {
    if (lambda <= 0) return 0
    if (lambda > 30) {
      return Math.max(0, Math.round(this.normal(lambda, Math.sqrt(lambda))))
    }
    const limit = Math.exp(-lambda)
    let product = 1
    let count = 0
    do {
      count += 1
      product *= this.next()
    } while (product > limit)
    return count - 1
  }
}

export function createRng(seed: number, ...parts: (string | number)[]): Rng {
  const [a, b, c, d] = cyrb128([seed, ...parts].join('\u0001'))
  // cyrb128 的第一个字已经是四个内部状态的异或；再互相异或会抵消成固定值。
  return new Rng(a ^ ((b << 7) | (b >>> 25)) ^ ((c << 13) | (c >>> 19)) ^ ((d << 21) | (d >>> 11)))
}

export function hashString(input: string): string {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const record = value as Record<string, unknown>
  const keys = Object.keys(record).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`
}

export function hashState(value: unknown): string {
  const canonical = stableStringify(value)
  return `${hashString(canonical)}${hashString(`state\u0001${canonical}`)}`
}

export function seededId(seed: number, ...parts: (string | number)[]): string {
  return hashString([seed, ...parts].join('|'))
}
