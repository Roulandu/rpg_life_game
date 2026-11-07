import { useState } from 'react'
import { ALLOCATION_MAX_PER_ATTR } from '../../../domain'
import type {
  Archetype,
  AttrAllocation,
  AttrKey,
  CareerBackground,
  CareerCreateOptions,
  Position,
} from '../../../domain'
import { selectCareerPreview, selectStartingClubs } from '../../../store'

export const CAREER_CLUB_OPTIONS = selectStartingClubs()

function rollSeed(): number {
  return Math.floor(Math.random() * 900000) + 100000
}

/** 种子框的取值域与 `rollSeed()` 同一条区间：1–999999 的整数。 */
export const SEED_MIN = 1
export const SEED_MAX = 999999

/**
 * 只认纯数字写法。`1e21`、`12.5`、空串一律返回 null：
 * 数字输入框会把超范围的手写值静默折成浮点近似（1e21 与 1000000000000000000000 折叠后同一个世界），
 * 静默改写比报错更难发现。
 */
export function parseSeed(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null
  const value = Number(text.trim())
  return value >= SEED_MIN && value <= SEED_MAX ? value : null
}

export function seedIssueOf(text: string): string | null {
  return parseSeed(text) === null
    ? `种子只能是 ${SEED_MIN}–${SEED_MAX} 之间的整数，现在这个值不会被采用。`
    : null
}

/** 点买步进：减到 0 就删键，加到 4 就封顶，非法值不可能出现在草稿里。 */
function nextAllocation(current: AttrAllocation, attrKey: AttrKey, delta: number): AttrAllocation {
  const next = { ...current }
  const value = (next[attrKey] ?? 0) + delta
  if (value <= 0) delete next[attrKey]
  else next[attrKey] = Math.min(ALLOCATION_MAX_PER_ATTR, value)
  return next
}

/**
 * 建号草稿：界面唯一的状态来源。
 * `draftOptions()` 产出的对象就是最终提交给 `createCareer` 的那一份，
 * 预览也读同一份，所以「看到的」与「签下去的」不可能分叉。
 */
export function useCareerDraft() {
  const [name, setName] = useState('林远')
  const [nationality, setNationality] = useState<string>('英格兰')
  const [age, setAge] = useState(17)
  const [position, setPosition] = useState<Position>('CM')
  const [archetype, setArchetype] = useState<Archetype>('technician')
  const [background, setBackground] = useState<CareerBackground>('academy')
  const [clubId, setClubId] = useState(CAREER_CLUB_OPTIONS[1].id)
  const [seed, setSeed] = useState(rollSeed)
  const [seedText, setSeedText] = useState(() => String(seed))
  const [allocation, setAllocation] = useState<AttrAllocation>({})

  function draftOptions(): CareerCreateOptions {
    return {
      name: name.trim() || '无名球员',
      nationality,
      age,
      position,
      archetype,
      background,
      clubId,
      seed,
      allocation,
    }
  }

  return {
    name,
    setName,
    nationality,
    setNationality,
    age,
    setAge,
    position,
    setPosition,
    archetype,
    setArchetype,
    background,
    setBackground,
    clubId,
    setClubId,
    seed,
    seedText,
    seedIssue: seedIssueOf(seedText),
    editSeed: (text: string) => {
      setSeedText(text)
      const value = parseSeed(text)
      if (value !== null) setSeed(value)
    },
    allocation,
    rollSeed: () => {
      const value = rollSeed()
      setSeed(value)
      setSeedText(String(value))
    },
    bump: (attrKey: AttrKey, delta: number) => setAllocation((current) => nextAllocation(current, attrKey, delta)),
    resetAllocation: () => setAllocation({}),
    // 预览每次渲染重算：只跑一次属性生成，不生成世界。
    preview: selectCareerPreview(draftOptions()),
    draftOptions,
  }
}

export type CareerDraft = ReturnType<typeof useCareerDraft>
