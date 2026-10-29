import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Dices, Sparkles } from 'lucide-react'
import {
  ARCHETYPE_LABELS,
  BACKGROUND_LABELS,
  NATIONALITIES,
  POSITION_LABELS,
  archetypeBonus,
  backgroundBonus,
} from '../../domain'
import type { Archetype, CareerBackground, Position } from '../../domain'
import { selectStartingClubs } from '../../store'
import { useGameStore } from '../../store'
import { Card, SectionTitle } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import clsx from 'clsx'

const POSITIONS: Position[] = ['GK', 'CB', 'LB', 'RB', 'DM', 'CM', 'AM', 'LW', 'RW', 'ST']
const ARCHETYPES: Archetype[] = ['speedster', 'technician', 'engine', 'finisher', 'wall']
const BACKGROUNDS: CareerBackground[] = ['academy', 'lowerLeague', 'overseas']
const STARTING_CLUB_OPTIONS = selectStartingClubs()

const BACKGROUND_DESCRIPTIONS: Record<CareerBackground, string> = {
  academy: '从小在青训学院长大，技术基础扎实。',
  lowerLeague: '在低级别联赛摸爬滚打，身体与对抗更成熟。',
  overseas: '早早离开家乡，心理适应能力更强。',
}

export function CreateCareerScreen() {
  const navigate = useNavigate()
  const createCareer = useGameStore((state) => state.createCareer)
  const busy = useGameStore((state) => state.busy)

  const [name, setName] = useState('林远')
  const [nationality, setNationality] = useState<string>('英格兰')
  const [age, setAge] = useState(17)
  const [position, setPosition] = useState<Position>('CM')
  const [archetype, setArchetype] = useState<Archetype>('technician')
  const [background, setBackground] = useState<CareerBackground>('academy')
  const [clubId, setClubId] = useState(STARTING_CLUB_OPTIONS[1].id)
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 900000) + 100000)

  const combinedBonus: Record<string, number> = {}
  for (const source of [archetypeBonus(archetype), backgroundBonus(background)]) {
    for (const [key, value] of Object.entries(source)) {
      if (typeof value === 'number') combinedBonus[key] = (combinedBonus[key] ?? 0) + value
    }
  }
  const attrLabels: Record<string, string> = {
    pace: '速度',
    shooting: '射门',
    passing: '传球',
    dribbling: '盘带',
    defending: '防守',
    physical: '身体',
    mental: '心理',
    technique: '技术',
    stamina: '体能',
  }

  async function handleSubmit() {
    await createCareer({
      name: name.trim() || '无名球员',
      nationality,
      age,
      position,
      archetype,
      background,
      clubId,
      seed,
    })
    if (useGameStore.getState().world) navigate('/game')
  }

  return (
    <div className="app-shell px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <button type="button" className="btn-ghost -ml-2 mb-3 px-2" onClick={() => navigate('/')}>
        <ArrowLeft size={16} /> 返回
      </button>
      <PageHeader
        eyebrow="新建生涯"
        title="你从哪里开始？"
        subtitle="16–21 岁，职业合同的第一天。属性、起点与种子都会影响这段人生。"
      />

      <div className="space-y-4">
        <Card>
          <SectionTitle>基本信息</SectionTitle>
          <div className="space-y-3">
            <div>
              <label className="label" htmlFor="player-name">
                姓名
              </label>
              <input
                id="player-name"
                className="input"
                maxLength={12}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="输入球员姓名"
              />
            </div>
            <div>
              <label className="label" htmlFor="nationality">
                国籍
              </label>
              <select
                id="nationality"
                className="input"
                value={nationality}
                onChange={(event) => setNationality(event.target.value)}
              >
                {NATIONALITIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="label mb-0">年龄</span>
                <span className="font-mono text-sm text-accent">{age} 岁</span>
              </div>
              <input
                type="range"
                min={16}
                max={21}
                step={1}
                value={age}
                onChange={(event) => setAge(Number(event.target.value))}
                className="w-full accent-[#c9f56b]"
                aria-label="年龄"
              />
              <div className="mt-1 flex justify-between text-[10px] text-dim">
                <span>16 · 更晚成型</span>
                <span>21 · 即战力更强</span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle>位置</SectionTitle>
          <div className="grid grid-cols-5 gap-1.5">
            {POSITIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPosition(item)}
                className={clsx(
                  'min-h-11 rounded-xl border text-xs font-medium transition',
                  position === item
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-line bg-card-2 text-muted hover:border-line hover:text-text',
                )}
              >
                {POSITION_LABELS[item]}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>球员类型</SectionTitle>
          <div className="grid grid-cols-2 gap-1.5">
            {ARCHETYPES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setArchetype(item)}
                className={clsx(
                  'min-h-11 rounded-xl border px-3 text-left text-xs font-medium transition',
                  archetype === item
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-line bg-card-2 text-muted hover:text-text',
                )}
              >
                {ARCHETYPE_LABELS[item]}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(combinedBonus)
              .filter(([, value]) => value !== 0)
              .map(([key, value]) => (
                <span key={key} className={clsx('chip', value > 0 ? 'text-accent' : 'text-danger')}>
                  {attrLabels[key] ?? key} {value > 0 ? '+' : ''}
                  {value}
                </span>
              ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>成长背景</SectionTitle>
          <div className="space-y-1.5">
            {BACKGROUNDS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setBackground(item)}
                className={clsx(
                  'flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition',
                  background === item
                    ? 'border-accent bg-accent/10'
                    : 'border-line bg-card-2 hover:text-text',
                )}
              >
                <span>
                  <span className={clsx('block text-sm font-medium', background === item ? 'text-accent' : 'text-text')}>
                    {BACKGROUND_LABELS[item]}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted">{BACKGROUND_DESCRIPTIONS[item]}</span>
                </span>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>起点俱乐部</SectionTitle>
          <div className="space-y-1.5">
            {STARTING_CLUB_OPTIONS.map((club) => (
              <button
                key={club.id}
                type="button"
                onClick={() => setClubId(club.id)}
                className={clsx(
                  'w-full rounded-xl border px-3 py-3 text-left transition',
                  clubId === club.id ? 'border-accent bg-accent/10' : 'border-line bg-card-2',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={clsx('text-sm font-medium', clubId === club.id ? 'text-accent' : 'text-text')}>
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

        <Card>
          <SectionTitle
            right={
              <button
                type="button"
                className="chip text-accent"
                onClick={() => setSeed(Math.floor(Math.random() * 900000) + 100000)}
              >
                <Dices size={12} /> 随机
              </button>
            }
          >
            世界种子
          </SectionTitle>
          <input
            className="input font-mono"
            type="number"
            min={1}
            value={seed}
            onChange={(event) => setSeed(Math.max(1, Number(event.target.value) || 1))}
            aria-label="世界种子"
          />
          <p className="mt-2 text-[11px] leading-relaxed text-dim">
            相同种子与相同选择会产生相同的比赛结果。种子只影响世界，不影响你的自由选择。
          </p>
        </Card>

        <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => void handleSubmit()}>
          <Sparkles size={16} />
          {busy ? '正在生成世界…' : '签下第一份合同'}
        </button>
        <p className="pb-4 text-center text-[10px] text-dim">创建后会自动保存到本机。</p>
      </div>
    </div>
  )
}
