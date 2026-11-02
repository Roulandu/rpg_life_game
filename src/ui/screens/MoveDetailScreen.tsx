import { Link, useParams } from 'react-router-dom'
import { RARITY_LABELS, moveById } from '../../domain'
import { useGameStore } from '../../store'
import { Card, EmptyState, SectionTitle } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { MoveFactsCard } from './moves/MoveFactsCard'
import { MoveInvestButton } from './moves/MoveInvestButton'
import { MoveLevelTable } from './moves/MoveLevelTable'
import { moveStatusText } from './moves/moveView'

function BackLink() {
  return (
    <Link to="/moves" className="mt-4 inline-flex min-h-[44px] items-center text-xs text-accent">
      返回绝技列表
    </Link>
  )
}

export function MoveDetailScreen() {
  const world = useGameStore((state) => state.world)
  const error = useGameStore((state) => state.error)
  const investMoveExp = useGameStore((state) => state.investMoveExp)
  const { moveId } = useParams()
  if (!world) return null

  const user = world.players[world.playerId]
  const move = moveId ? moveById(moveId) : undefined
  if (!move || !user) {
    return (
      <div className="page-pad pb-6 sm:mx-auto sm:max-w-[760px]">
        <PageHeader eyebrow="绝技" title="绝技详情" />
        <EmptyState title="找不到这门绝技" body="它不在这个版本的数据包里，等下一批内容上线再来看。" />
        <BackLink />
      </div>
    )
  }

  const locked = Boolean(world.pendingDayPlan) || world.lastMatch?.status === 'live'

  return (
    <div className="page-pad pb-6 sm:mx-auto sm:max-w-[760px]">
      <PageHeader
        eyebrow={RARITY_LABELS[move.rarity]}
        title={move.nameZh}
        subtitle={moveStatusText(move, user)}
      />

      <MoveFactsCard move={move} />

      <section className="mb-3">
        <SectionTitle>各级效果</SectionTitle>
        <MoveLevelTable move={move} user={user} />
      </section>

      <section className="mb-3">
        <SectionTitle>练成之后</SectionTitle>
        <Card>
          <p className="text-[11px] leading-relaxed text-teal">{move.textZh.success}</p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-dim">{move.textZh.fail}</p>
        </Card>
      </section>

      <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-line bg-card-2 px-3 py-2.5">
        <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-muted">
          练成后它只在命中那些回合时改变概率，加成与对手段都会写进选项的依据行。
        </p>
        <MoveInvestButton
          move={move}
          user={user}
          locked={locked}
          onInvest={(id) => void investMoveExp(id)}
        />
      </div>

      {locked ? (
        <p className="mt-2 text-[11px] leading-relaxed text-dim">比赛进行中不能改绝技，先把今天踢完。</p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-[11px] text-danger">
          {error}
        </p>
      ) : null}

      <BackLink />
    </div>
  )
}
