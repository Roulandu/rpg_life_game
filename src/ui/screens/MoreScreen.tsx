import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../store'
import { formatMoneyShort, formatSeasonLabel } from '../../lib'
import { PageHeader } from '../components/PageHeader'
import { MorePrimaryColumn } from './more/MorePrimaryColumn'
import { MoreSecondaryColumn } from './more/MoreSecondaryColumn'

export function MoreScreen() {
  const navigate = useNavigate()
  const world = useGameStore((state) => state.world)
  const importFromText = useGameStore((state) => state.importFromText)
  const fileRef = useRef<HTMLInputElement>(null)
  if (!world) return null

  const user = world.players[world.playerId]

  return (
    <div className="page-pad pb-6 sm:mx-auto sm:max-w-[960px] lg:max-w-none">
      <PageHeader
        eyebrow={formatSeasonLabel(world.season)}
        title="更多"
        subtitle={`${user.name} · 第 ${world.week} 周`}
        right={<span className="chip">{formatMoneyShort(world.finance.balance)}</span>}
      />

      <div data-testid="more-grid" className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
        <div className="min-w-0">
          <MorePrimaryColumn world={world} />
        </div>
        <div className="min-w-0">
          <MoreSecondaryColumn world={world} onImport={() => fileRef.current?.click()} />
        </div>
      </div>

      <button type="button" className="btn-secondary w-full lg:mt-6" onClick={() => navigate('/')}>
        返回标题
      </button>

      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0]
          if (!file) return
          const ok = await importFromText(await file.text())
          event.target.value = ''
          if (ok) navigate('/game')
        }}
      />
    </div>
  )
}
