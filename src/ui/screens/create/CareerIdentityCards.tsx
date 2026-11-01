import {
  ARCHETYPE_LABELS,
  ATTR_KEYS,
  ATTR_LABELS,
  BACKGROUND_LABELS,
  NATIONALITIES,
  POSITION_LABELS,
} from '../../../domain'
import type { AttrKey } from '../../../domain'
import { ARCHETYPES, BACKGROUNDS, BACKGROUND_DESCRIPTIONS, POSITIONS } from './careerChoices'
import type { CareerDraft } from './useCareerDraft'
import { Card, SectionTitle } from '../../components/Card'
import clsx from 'clsx'

function CareerNameField({ draft }: { draft: CareerDraft }) {
  return (
    <div>
      <label className="label" htmlFor="player-name">
        姓名
      </label>
      <input
        id="player-name"
        className="input"
        maxLength={12}
        value={draft.name}
        onChange={(event) => draft.setName(event.target.value)}
        placeholder="输入球员姓名"
      />
    </div>
  )
}

function CareerNationalityField({ draft }: { draft: CareerDraft }) {
  return (
    <div>
      <label className="label" htmlFor="nationality">
        国籍
      </label>
      <select
        id="nationality"
        className="input"
        value={draft.nationality}
        onChange={(event) => draft.setNationality(event.target.value)}
      >
        {NATIONALITIES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>
  )
}

function CareerAgeField({ draft }: { draft: CareerDraft }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="label mb-0">年龄</span>
        <span className="font-mono text-sm text-accent">{draft.age} 岁</span>
      </div>
      <input
        type="range"
        min={16}
        max={21}
        step={1}
        value={draft.age}
        onChange={(event) => draft.setAge(Number(event.target.value))}
        className="w-full accent-[var(--color-accent)]"
        aria-label="年龄"
      />
      <div className="mt-1 flex justify-between text-[10px] text-dim">
        <span>16 · 更晚成型</span>
        <span>21 · 即战力更强</span>
      </div>
    </div>
  )
}

export function CareerBasicsCard({ draft }: { draft: CareerDraft }) {
  return (
    <Card>
      <SectionTitle>基本信息</SectionTitle>
      <div className="space-y-3">
        <CareerNameField draft={draft} />
        <CareerNationalityField draft={draft} />
        <CareerAgeField draft={draft} />
      </div>
    </Card>
  )
}

export function CareerPositionCard({ draft }: { draft: CareerDraft }) {
  return (
    <Card>
      <SectionTitle>位置</SectionTitle>
      <div className="grid grid-cols-5 gap-1.5">
        {POSITIONS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => draft.setPosition(item)}
            className={clsx(
              'min-h-11 rounded-xl border text-xs font-medium transition',
              draft.position === item
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-line bg-card-2 text-muted hover:border-line hover:text-text',
            )}
          >
            {POSITION_LABELS[item]}
          </button>
        ))}
      </div>
    </Card>
  )
}

export function CareerArchetypeCard({
  draft,
  bonus,
}: {
  draft: CareerDraft
  bonus: Partial<Record<AttrKey, number>>
}) {
  return (
    <Card>
      <SectionTitle>球员类型</SectionTitle>
      <div className="grid grid-cols-2 gap-1.5">
        {ARCHETYPES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => draft.setArchetype(item)}
            className={clsx(
              'min-h-11 rounded-xl border px-3 text-left text-xs font-medium transition',
              draft.archetype === item
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-line bg-card-2 text-muted hover:text-text',
            )}
          >
            {ARCHETYPE_LABELS[item]}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {ATTR_KEYS.filter((key) => (bonus[key] ?? 0) !== 0).map((key) => (
          <span key={key} className={clsx('chip', (bonus[key] ?? 0) > 0 ? 'text-accent' : 'text-danger')}>
            {ATTR_LABELS[key]} {(bonus[key] ?? 0) > 0 ? '+' : ''}
            {bonus[key]}
          </span>
        ))}
      </div>
    </Card>
  )
}

export function CareerBackgroundCard({ draft }: { draft: CareerDraft }) {
  return (
    <Card>
      <SectionTitle>成长背景</SectionTitle>
      <div className="space-y-1.5">
        {BACKGROUNDS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => draft.setBackground(item)}
            className={clsx(
              'flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition',
              draft.background === item ? 'border-accent bg-accent/10' : 'border-line bg-card-2 hover:text-text',
            )}
          >
            <span>
              <span
                className={clsx('block text-sm font-medium', draft.background === item ? 'text-accent' : 'text-text')}
              >
                {BACKGROUND_LABELS[item]}
              </span>
              <span className="mt-0.5 block text-[11px] text-muted">{BACKGROUND_DESCRIPTIONS[item]}</span>
            </span>
          </button>
        ))}
      </div>
    </Card>
  )
}
