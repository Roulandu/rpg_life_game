import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  LoaderCircle,
  MessageSquare,
  Newspaper,
  Settings,
  Sparkles,
  Trophy,
  Wallet,
} from 'lucide-react'
import { POSITION_LABELS, overall } from '../../domain/attributes'
import { useGameStore } from '../../store/gameStore'
import { selectPendingKeyMoments } from '../../store/selectors'
import { computeLeagueTable } from '../../domain/leagueTable'
import { formatMoneyShort, formatSeasonLabel, formatWeekLabel } from '../../lib/format'
import { Card, SectionTitle } from '../components/Card'
import { StatBar } from '../components/StatBar'
import { WeekPlannerModal } from '../components/WeekPlannerModal'
import {
  formClass,
  formLabel,
  formOf,
  leaguePositionFor,
  leagueRowFor,
  nextFixtureOf,
  opponentOfClub,
} from '../gameHelpers'
import clsx from 'clsx'

const NEWS_KIND_LABEL: Record<string, string> = {
  match: '比赛',
  transfer: '转会',
  media: '媒体',
  club: '俱乐部',
  award: '荣誉',
  system: '系统',
}

export function DashboardScreen() {
  const navigate = useNavigate()
  const world = useGameStore((state) => state.world)
  const busy = useGameStore((state) => state.busy)
  const aiBusy = useGameStore((state) => state.aiBusy)
  const aiError = useGameStore((state) => state.aiError)
  const clearAiError = useGameStore((state) => state.clearAiError)
  const [plannerOpen, setPlannerOpen] = useState(false)

  if (!world) return null
  const user = world.players[world.playerId]
  const club = world.clubs[world.clubId]
  const league = world.leagues[club.leagueId]
  const row = leagueRowFor(world, league.id, club.id)
  const position = leaguePositionFor(world, league.id, club.id)
  const next = nextFixtureOf(world, club.id)
  const opponent = next ? opponentOfClub(world, next, club.id) : null
  const isHome = next?.homeId === club.id
  const opponentForm = opponent ? formOf(world, opponent.id) : []
  const last = world.lastMatch
  const pendingMatch = selectPendingKeyMoments(world)
  const keyMoments = last?.keyMoments ?? []
  const pendingMoments = keyMoments.filter((moment) => !moment.outcome)
  const resolvedMoments = keyMoments.length - pendingMoments.length
  const openEvents = Object.values(world.events)
    .filter((event) => event.status === 'open')
    .sort((a, b) => b.week - a.week)
  const latestEvent = openEvents[0]
  const news = world.news.slice(0, 3)
  const table = computeLeagueTable(world, league.id)
  const miniTable = table.slice(0, 5)
  if (position > 5) {
    const userRow = table[position - 1]
    if (userRow) miniTable.push(userRow)
  }

  const nextMatchExtra = opponentForm.length > 0 ? opponentForm.map(formLabel).join('') : '尚无比赛'

  return (
    <div className="page-pad pb-6">
      <header className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="grid size-11 shrink-0 place-items-center rounded-xl border text-base font-black"
              style={{
                backgroundColor: club.colors.secondary,
                borderColor: club.colors.primary,
                color: club.colors.primary,
              }}
              aria-hidden="true"
            >
              {club.nameZh.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-accent">
                {formatSeasonLabel(world.season)} · 第 {world.week} 周
              </p>
              <h1 className="truncate text-xl font-semibold leading-tight text-text">{club.nameZh}</h1>
              <p className="mt-0.5 text-[11px] text-muted">
                {league.nameZh} · 第 {position || '—'} 名
              </p>
            </div>
          </div>
          <div className="flex items-start gap-1">
            <div className="text-right">
              <p className="text-[10px] text-dim">能力</p>
              <p className="font-mono text-3xl font-semibold leading-none text-accent">{overall(user).toFixed(1)}</p>
              <p className="mt-1 font-mono text-[10px] text-muted">{formatMoneyShort(world.finance.balance)}</p>
            </div>
            <button type="button" className="btn-ghost -mr-2 px-2" aria-label="设置" onClick={() => navigate('/settings')}>
              <Settings size={17} />
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">
          {user.name} · {POSITION_LABELS[user.position]} · {user.age} 岁
          {user.injury ? <span className="ml-2 text-danger">伤停 {user.injury.weeksLeft} 周</span> : null}
        </p>
      </header>

      {last ? (
        <button
          type="button"
          className={clsx(
            'card mb-3 flex w-full items-center justify-between gap-3 px-4 py-3 text-left',
            pendingMatch && 'border-teal/40',
          )}
          onClick={() => navigate('/match')}
        >
          <div className="min-w-0">
            <p className={clsx('text-[10px] uppercase tracking-[0.14em]', pendingMatch ? 'text-teal' : 'text-dim')}>
              {pendingMatch ? '比赛日进行中' : '上轮结果'}
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-text">
              {last.homeName} {last.homeGoals}-{last.awayGoals} {last.awayName}
              {pendingMatch ? ` · 关键回合 ${resolvedMoments}/${keyMoments.length}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted">
              {pendingMatch ? '继续' : last.userPlayed ? `${last.userRating?.toFixed(1)} 分` : '未出场'}
            </span>
            <ChevronRight size={15} className="text-dim" />
          </div>
        </button>
      ) : null}

      {pendingMatch ? (
        <Card className="mb-3 border-teal/30 p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-teal">
            <Sparkles size={12} /> 等待你做出关键回合的选择
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-muted">
            本周的比赛尚未结束，GM 会在比赛日完成后撰写叙事。完成剩余 {pendingMoments.length} 个关键回合即可继续推进。
          </p>
        </Card>
      ) : aiBusy || aiError || world.aiNarrative ? (
        <section className="mb-3">
          <SectionTitle
            right={
              <span className="flex items-center gap-1 text-[10px] text-teal">
                <Sparkles size={11} /> AI 生成
              </span>
            }
          >
            本周 GM
          </SectionTitle>
          {aiBusy ? (
            <Card className="space-y-2 p-4" aria-live="polite">
              <div className="h-3 w-28 animate-pulse rounded bg-card-2" />
              <div className="h-2.5 w-full animate-pulse rounded bg-card-2" />
              <div className="h-2.5 w-5/6 animate-pulse rounded bg-card-2" />
              <p className="pt-1 text-[10px] text-dim">GM 正在撰写这周的故事，比赛与数值已经结算完毕。</p>
            </Card>
          ) : world.aiNarrative ? (
            <Card className="p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-text">{world.aiNarrative.headline}</p>
                <span className="chip shrink-0 px-1.5 py-0 text-[9px] text-dim">
                  {formatWeekLabel(world.aiNarrative.season, world.aiNarrative.week)}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-line text-[12px] leading-relaxed text-muted">
                {world.aiNarrative.body}
              </p>
              {world.aiNarrative.npcNote ? (
                <p className="mt-2 rounded-lg border border-line-soft bg-card-2/60 px-2.5 py-2 text-[11px] leading-relaxed text-muted">
                  {world.aiNarrative.npcNote}
                </p>
              ) : null}
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[10px] text-dim">
                  {world.aiNarrative.suggestedAction
                    ? `可尝试：${world.aiNarrative.suggestedAction}`
                    : '叙事由 AI 生成，比赛与数值由引擎结算。'}
                </span>
                <button
                  type="button"
                  className="shrink-0 text-[10px] text-teal"
                  onClick={() => navigate('/inbox')}
                >
                  继续对话
                </button>
              </div>
            </Card>
          ) : null}
          {aiError ? (
            <Card className="mt-1.5 border-danger/25 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-danger" />
                <p className="flex-1 text-[11px] leading-relaxed text-danger">{aiError}</p>
                <button type="button" className="shrink-0 text-[10px] text-dim" onClick={clearAiError}>
                  知道了
                </button>
              </div>
            </Card>
          ) : null}
        </section>
      ) : null}

      <Card className="mb-3 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-line-soft px-4 py-2.5">
          <span className="flex items-center gap-1.5 text-[11px] text-muted">
            <CalendarDays size={13} /> 下一场 · 第 {next?.week ?? '—'} 周
          </span>
          <span className={clsx('chip', isHome ? 'border-accent/30 text-accent' : '')}>
            {isHome ? '主场' : '客场'}
          </span>
        </div>
        {next && opponent ? (
          <>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-4">
              <TeamBlock
                name={isHome ? club.nameZh : opponent.nameZh}
                colors={isHome ? club.colors : opponent.colors}
                align="left"
              />
              <div className="text-center">
                <p className="font-mono text-[10px] text-dim">VS</p>
                <p className="mt-1 text-[9px] text-dim">第 {next.week} 周</p>
              </div>
              <TeamBlock
                name={isHome ? opponent.nameZh : club.nameZh}
                colors={isHome ? opponent.colors : club.colors}
                align="right"
              />
            </div>
            <div className="flex items-center justify-between border-t border-line-soft px-4 py-2 text-[10px] text-dim">
              <span>{world.clubs[next.homeId]?.stadium ?? club.stadium}</span>
              <span>对手近况 {nextMatchExtra}</span>
            </div>
          </>
        ) : (
          <div className="px-4 py-6 text-center text-xs text-muted">本赛季赛程已经全部结束。</div>
        )}
      </Card>

      {world.retired ? (
        <Card className="mb-3 border-gold/30">
          <p className="text-sm font-medium text-gold">你已经挂靴</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            球员生涯已经结束。你仍然可以查看档案、时间线与本赛季的最终数据。
          </p>
          <button type="button" className="btn-secondary mt-3 w-full" onClick={() => navigate('/timeline')}>
            查看生涯时间线
          </button>
        </Card>
      ) : pendingMatch ? (
        <button type="button" className="btn-primary mb-4 w-full" onClick={() => navigate('/match')}>
          <Sparkles size={16} /> 继续比赛日 · {resolvedMoments}/{keyMoments.length}
        </button>
      ) : (
        <button
          type="button"
          className="btn-primary mb-4 w-full"
          disabled={busy}
          onClick={() => setPlannerOpen(true)}
        >
          {busy ? <LoaderCircle size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          {busy ? '正在模拟本周…' : `安排并推进第 ${world.week} 周`}
        </button>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2">
        <Card className="p-3">
          <StatBar label="体能" value={user.fitness} />
          <StatBar label="士气" value={user.morale} className="mt-2" />
        </Card>
        <Card className="p-3">
          <StatBar label="锐度" value={user.sharpness} />
          <StatBar label="状态" value={user.form} className="mt-2" />
        </Card>
      </div>

      <section className="mb-4">
        <SectionTitle
          right={
            <button type="button" className="text-[11px] text-muted hover:text-text" onClick={() => navigate('/schedule')}>
              完整赛程
            </button>
          }
        >
          联赛排名
        </SectionTitle>
        <Card className="p-3">
          <div className="mb-3 flex items-end justify-between">
            <div className="flex items-end gap-3">
              <div>
                <p className="text-[10px] text-dim">当前排名</p>
                <p className="font-mono text-3xl font-semibold leading-none text-text">{position || '—'}</p>
              </div>
              <div className="pb-0.5">
                <p className="text-[10px] text-dim">积分</p>
                <p className="font-mono text-lg leading-none text-accent">{row?.points ?? 0}</p>
              </div>
              <div className="pb-0.5">
                <p className="text-[10px] text-dim">战绩</p>
                <p className="font-mono text-[11px] text-muted">
                  {row ? `${row.won}胜 ${row.drawn}平 ${row.lost}负` : '—'}
                </p>
              </div>
            </div>
            <div className="flex gap-1 pb-0.5">
              {(row?.form ?? []).length > 0
                ? row!.form.map((result, index) => (
                    <span
                      key={`${result}-${index}`}
                      className={clsx('grid size-4 place-items-center rounded border text-[9px] font-bold', formClass(result))}
                    >
                      {formLabel(result)}
                    </span>
                  ))
                : <span className="text-[10px] text-dim">暂无</span>}
            </div>
          </div>
          <div className="space-y-0.5">
            {miniTable.map((tableRow) => {
              const index = table.findIndex((item) => item.clubId === tableRow.clubId) + 1
              const isUserClub = tableRow.clubId === club.id
              const tableClub = world.clubs[tableRow.clubId]
              return (
                <div
                  key={tableRow.clubId}
                  className={clsx(
                    'flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px]',
                    isUserClub ? 'bg-accent/10 text-accent' : 'text-muted',
                  )}
                >
                  <span className="w-4 text-right font-mono text-dim">{index}</span>
                  <span className="flex-1 truncate">{tableClub?.nameZh ?? tableRow.clubId}</span>
                  <span className="w-6 text-right font-mono text-dim">{tableRow.played}</span>
                  <span className="w-7 text-right font-mono text-dim">
                    {tableRow.goalsFor - tableRow.goalsAgainst > 0 ? '+' : ''}
                    {tableRow.goalsFor - tableRow.goalsAgainst}
                  </span>
                  <span className={clsx('w-6 text-right font-mono', isUserClub ? 'text-accent' : 'text-text')}>
                    {tableRow.points}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      </section>

      <section className="mb-4">
        <SectionTitle
          right={
            openEvents.length > 0 ? (
              <span className="chip border-accent/30 text-accent">{openEvents.length} 个待处理</span>
            ) : undefined
          }
        >
          收件箱
        </SectionTitle>
        {latestEvent ? (
          <Card className="border-accent/25 p-4">
            <div className="flex items-start gap-2">
              <MessageSquare size={15} className="mt-0.5 shrink-0 text-accent" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-text">{latestEvent.title}</p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">{latestEvent.body}</p>
              </div>
            </div>
            <button type="button" className="btn-secondary mt-3 w-full" onClick={() => navigate('/inbox')}>
              处理这周的事件
            </button>
          </Card>
        ) : (
          <Card className="p-4 text-center">
            <p className="text-xs text-muted">本周没有需要处理的私人事件。</p>
            <p className="mt-1 text-[10px] text-dim">训练与比赛仍然会继续改变你的生涯。</p>
          </Card>
        )}
      </section>

      <section>
        <SectionTitle
          right={
            <button type="button" className="text-[11px] text-muted hover:text-text" onClick={() => navigate('/inbox')}>
              全部消息
            </button>
          }
        >
          最新动态
        </SectionTitle>
        <div className="space-y-1.5">
          {news.length === 0 ? (
            <Card className="p-4 text-center text-xs text-muted">暂无新闻。推进一周后，这里会热闹起来。</Card>
          ) : (
            news.map((item) => (
              <Card key={item.id} className="flex items-start gap-2.5 p-3">
                <Newspaper size={14} className="mt-0.5 shrink-0 text-dim" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="chip px-1.5 py-0 text-[9px]">{NEWS_KIND_LABEL[item.kind] ?? item.kind}</span>
                    <p className="truncate text-[12px] font-medium text-text">{item.title}</p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted">{item.body}</p>
                </div>
              </Card>
            ))
          )}
        </div>
      </section>

      <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-dim">
        <span className="flex items-center gap-1">
          <Wallet size={12} /> {formatMoneyShort(world.finance.balance)}
        </span>
        <span className="flex items-center gap-1">
          <Trophy size={12} /> {formatWeekLabel(world.season, world.week)}
        </span>
      </div>

      <WeekPlannerModal open={plannerOpen} world={world} onClose={() => setPlannerOpen(false)} />
    </div>
  )
}

function TeamBlock({
  name,
  colors,
  align,
}: {
  name: string
  colors: { primary: string; secondary: string }
  align: 'left' | 'right'
}) {
  return (
    <div className={clsx('flex min-w-0 items-center gap-2', align === 'right' && 'flex-row-reverse')}>
      <div
        className="grid size-9 shrink-0 place-items-center rounded-lg border text-xs font-black"
        style={{ backgroundColor: colors.secondary, borderColor: colors.primary, color: colors.primary }}
        aria-hidden="true"
      >
        {name.slice(0, 1)}
      </div>
      <span className={clsx('min-w-0 truncate text-xs font-medium text-text', align === 'right' && 'text-right')}>
        {name}
      </span>
    </div>
  )
}
