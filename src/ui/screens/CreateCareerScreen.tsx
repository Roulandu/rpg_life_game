import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { useGameStore } from '../../store'
import { PageHeader } from '../components/PageHeader'
import {
  CareerArchetypeCard,
  CareerBackgroundCard,
  CareerBasicsCard,
  CareerPositionCard,
} from './create/CareerIdentityCards'
import { CareerAttributeCard } from './create/CareerAttributeCard'
import { CareerClubCard, CareerSeedCard } from './create/CareerStartCards'
import { combinedBonusOf } from './create/careerChoices'
import { useCareerDraft } from './create/useCareerDraft'

export function CreateCareerScreen() {
  const navigate = useNavigate()
  const createCareer = useGameStore((state) => state.createCareer)
  const busy = useGameStore((state) => state.busy)
  const draft = useCareerDraft()

  async function handleSubmit() {
    await createCareer(draft.draftOptions())
    if (useGameStore.getState().world) navigate('/game')
  }

  return (
    <div className="app-shell px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))] sm:max-w-[var(--focus-max)]">
      <button type="button" className="btn-ghost -ml-2 mb-3 px-2" onClick={() => navigate('/')}>
        <ArrowLeft size={16} /> 返回
      </button>
      <PageHeader
        eyebrow="新建生涯"
        title="你从哪里开始？"
        subtitle="16–21 岁，职业合同的第一天。属性、起点与种子都会影响这段人生。"
      />

      <div className="space-y-4">
        <CareerBasicsCard draft={draft} />
        <CareerPositionCard draft={draft} />
        <CareerArchetypeCard draft={draft} bonus={combinedBonusOf(draft.archetype, draft.background)} />
        <CareerBackgroundCard draft={draft} />
        <CareerAttributeCard draft={draft} />
        <CareerClubCard draft={draft} />
        <CareerSeedCard draft={draft} />

        <button
          type="button"
          className="btn-primary w-full"
          disabled={busy || !draft.preview.ok}
          onClick={() => void handleSubmit()}
        >
          <Sparkles size={16} />
          {busy ? '正在生成世界…' : '签下第一份合同'}
        </button>
        <p className="pb-4 text-center text-[10px] text-dim">创建后会自动保存到本机。</p>
      </div>
    </div>
  )
}
