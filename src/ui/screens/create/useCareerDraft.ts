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
    setSeed,
    allocation,
    rollSeed: () => setSeed(rollSeed()),
    bump: (attrKey: AttrKey, delta: number) => setAllocation((current) => nextAllocation(current, attrKey, delta)),
    resetAllocation: () => setAllocation({}),
    // 预览每次渲染重算：只跑一次属性生成，不生成世界。
    preview: selectCareerPreview(draftOptions()),
    draftOptions,
  }
}

export type CareerDraft = ReturnType<typeof useCareerDraft>
