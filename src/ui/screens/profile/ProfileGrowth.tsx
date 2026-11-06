import {
  ATTR_KEYS,
  ATTR_LABELS,
  attributeCap,
  INVEST_HARD_CAP,
  investmentCost,
  maxInvestable,
  positionGroup,
} from '../../../domain'
import type { AttrKey, Player, WorldState } from '../../../domain'
import { useGameStore } from '../../../store'
import { Card, SectionTitle } from '../../components/Card'

function matchLocked(world: WorldState): boolean {
  return Boolean(world.pendingDayPlan) || world.lastMatch?.status === 'live'
}

/** 行内的可投状态一律问 domain 的三个纯函数，避免界面自己算第二套价格与上限。 */
function hintOf(user: Player, attrKey: AttrKey): { enabled: boolean; hint: string } {
  const invested = user.attrInvestment[attrKey] ?? 0
  const cost = investmentCost(invested)
  if (maxInvestable(user, attrKey) > 0) return { enabled: true, hint: `${cost} 经验` }
  if (invested >= attributeCap(user)) {
    return { enabled: false, hint: `已练满 ${attributeCap(user)} 点` }
  }
  if (user.attributes[attrKey] >= INVEST_HARD_CAP) {
    return { enabled: false, hint: `已到属性天花板 ${INVEST_HARD_CAP}` }
  }
  if (cost > user.exp) return { enabled: false, hint: `要 ${cost} 经验` }
  return { enabled: false, hint: '已到潜力' }
}

export function ProfileGrowth({ world, user }: { world: WorldState; user: Player }) {
  const investExp = useGameStore((state) => state.investExp)
  const error = useGameStore((state) => state.error)
  const locked = matchLocked(world)
  const keys =
    positionGroup(user.position) === 'GK' ? ATTR_KEYS : ATTR_KEYS.filter((key) => key !== 'goalkeeping')

  return (
    <section className="mb-3">
      <SectionTitle right={<span className="chip text-accent">{user.exp} 点可用</span>}>成长投资</SectionTitle>
      <Card>
        <p className="text-[11px] leading-relaxed text-muted">
          训练与比赛攒下的经验花在这里。单项最多投 {attributeCap(user)} 点，累计经验每满 20 点再解锁 1 点；
          属性值不超过 {INVEST_HARD_CAP}，综合分不超过你的潜力 {user.potential.toFixed(1)}。
        </p>
        <ul className="mt-3 space-y-1.5">
          {keys.map((key) => {
            const state = hintOf(user, key)
            return (
              <li
                key={key}
                className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-line bg-card-2 px-3 py-2"
              >
                <span className="min-w-0">
                  <span className="block text-sm text-text">{ATTR_LABELS[key]}</span>
                  <span className="mt-0.5 block font-mono text-[11px] text-dim">
                    {user.attributes[key].toFixed(1)}
                    <span className="ml-1">
                      已投 {user.attrInvestment[key] ?? 0}/{attributeCap(user)} 点
                    </span>
                  </span>
                </span>
                <button
                  type="button"
                  className="btn-ghost shrink-0 rounded-xl border border-line px-3 text-xs"
                  disabled={locked || !state.enabled}
                  onClick={() => void investExp(key, 1)}
                >
                  +1 · {state.hint}
                </button>
              </li>
            )
          })}
        </ul>
        {locked ? <p className="mt-2 text-[11px] text-dim">比赛进行中不能改属性，先踢完今天。</p> : null}
        {error ? (
          <p role="alert" className="mt-2 text-[11px] text-danger">
            {error}
          </p>
        ) : null}
      </Card>
    </section>
  )
}
