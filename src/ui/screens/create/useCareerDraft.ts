import { useState } from 'react'
import type { Archetype, CareerBackground, CareerCreateOptions, Position } from '../../../domain'
import { selectStartingClubs } from '../../../store'

export const CAREER_CLUB_OPTIONS = selectStartingClubs()

function rollSeed(): number {
  return Math.floor(Math.random() * 900000) + 100000
}

/**
 * 建号草稿：界面唯一的状态来源。
 * `draftOptions()` 产出的对象就是最终提交给 `createCareer` 的那一份，避免表单与提交各读一套值。
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
    rollSeed: () => setSeed(rollSeed()),
    draftOptions,
  }
}

export type CareerDraft = ReturnType<typeof useCareerDraft>
