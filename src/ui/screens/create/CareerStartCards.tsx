import { Dices } from 'lucide-react'
import { Card, SectionTitle } from '../../components/Card'
import { CAREER_CLUB_OPTIONS, SEED_MAX, SEED_MIN } from './useCareerDraft'
import type { CareerDraft } from './useCareerDraft'
import clsx from 'clsx'

export function CareerClubCard({ draft }: { draft: CareerDraft }) {
  return (
    <Card>
      <SectionTitle>起点俱乐部</SectionTitle>
      <div className="space-y-1.5">
        {CAREER_CLUB_OPTIONS.map((club) => (
          <button
            key={club.id}
            type="button"
            onClick={() => draft.setClubId(club.id)}
            className={clsx(
              'w-full min-h-[44px] rounded-xl border px-3 py-3 text-left transition',
              draft.clubId === club.id ? 'border-accent bg-accent/10' : 'border-line bg-card-2',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={clsx('text-sm font-medium', draft.clubId === club.id ? 'text-accent' : 'text-text')}>
                {club.name}
              </span>
              <span className="chip">{club.difficulty}</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">{club.description}</p>
            <p className="mt-1 text-[10px] text-dim">目标：{club.expectation}</p>
          </button>
        ))}
      </div>
    </Card>
  )
}

export function CareerSeedCard({ draft }: { draft: CareerDraft }) {
  return (
    <Card>
      <SectionTitle
        right={
          <button type="button" className="chip min-h-11 min-w-11 text-accent" onClick={draft.rollSeed}>
            <Dices size={12} /> 随机
          </button>
        }
      >
        世界种子
      </SectionTitle>
      <input
        className="input font-mono"
        type="number"
        min={SEED_MIN}
        max={SEED_MAX}
        step={1}
        value={draft.seedText}
        aria-invalid={draft.seedIssue !== null}
        aria-describedby={draft.seedIssue === null ? undefined : 'seed-issue'}
        onChange={(event) => draft.editSeed(event.target.value)}
        aria-label="世界种子"
      />
      {draft.seedIssue ? (
        <p id="seed-issue" role="alert" className="mt-2 text-[11px] leading-relaxed text-warn">
          {draft.seedIssue}
        </p>
      ) : null}
      <p className="mt-2 text-[11px] leading-relaxed text-dim">
        相同种子与相同选择会产生相同的比赛结果。种子只影响世界，不影响你的自由选择。
      </p>
    </Card>
  )
}
