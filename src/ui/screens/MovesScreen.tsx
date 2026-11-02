import { MOVE_PACK_NAMES, allMoves, moveById, moveFitsPosition, moveLevelOf } from '../../domain'
import type { MoveDefinition, Player } from '../../domain'
import { formatDayLabel } from '../../lib'
import { useGameStore } from '../../store'
import { Card, SectionTitle } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { HeldMoveList } from './moves/HeldMoveList'
import { MoveCatalog } from './moves/MoveCatalog'

function isMove(move: MoveDefinition | undefined): move is MoveDefinition {
  return Boolean(move)
}

/** 图鉴按技术流派归类、同族里先列便宜的一级：让玩家先看得见「现在买得起什么」。 */
function byFamilyThenCost(a: MoveDefinition, b: MoveDefinition): number {
  const familyGap = MOVE_PACK_NAMES.indexOf(a.family) - MOVE_PACK_NAMES.indexOf(b.family)
  if (familyGap !== 0) return familyGap
  return (a.levels[0]?.costExp ?? 0) - (b.levels[0]?.costExp ?? 0)
}

/** 已经在练的按级数排：练得最久的排最前，0 级的修炼中垫底。 */
function byLevelDesc(user: Player) {
  return (a: MoveDefinition, b: MoveDefinition) => {
    const levelGap = moveLevelOf(user, b.id) - moveLevelOf(user, a.id)
    return levelGap !== 0 ? levelGap : byFamilyThenCost(a, b)
  }
}

export function MovesScreen() {
  const world = useGameStore((state) => state.world)
  const error = useGameStore((state) => state.error)
  const investMoveExp = useGameStore((state) => state.investMoveExp)
  if (!world) return null

  const user = world.players[world.playerId]
  if (!user) return null

  const heldIds = new Set((user.moves ?? []).map((item) => item.moveId))
  const held = [...heldIds].map((id) => moveById(id)).filter(isMove).sort(byLevelDesc(user))
  const catalog = allMoves()
    .filter((move) => moveFitsPosition(move, user.position) && !heldIds.has(move.id))
    .sort(byFamilyThenCost)
  const locked = Boolean(world.pendingDayPlan) || world.lastMatch?.status === 'live'

  return (
    <div className="page-pad pb-6 sm:mx-auto sm:max-w-[760px]">
      <PageHeader
        eyebrow={formatDayLabel(world.season, world.week, world.day)}
        title="绝技"
        subtitle={`${user.exp} 点经验可用 · 只有位置对得上的绝技才会出现在这里`}
      />

      <section className="mb-3">
        <SectionTitle right={<span className="chip">{held.length} 招</span>}>我在练的</SectionTitle>
        <HeldMoveList moves={held} user={user} />
      </section>

      <section className="mb-3">
        <SectionTitle right={<span className="chip">{catalog.length} 招可学</span>}>绝技图鉴</SectionTitle>
        {catalog.length === 0 ? (
          <Card>
            <p className="text-[11px] leading-relaxed text-muted">
              这个位置能学的绝技都已经在练了。比赛掉落与名宿的指点还会带来新招数。
            </p>
          </Card>
        ) : (
          <MoveCatalog moves={catalog} user={user} locked={locked} onInvest={(id) => void investMoveExp(id)} />
        )}
      </section>

      {locked ? (
        <p className="text-[11px] leading-relaxed text-dim">比赛进行中不能改绝技，先把今天踢完。</p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-[11px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
