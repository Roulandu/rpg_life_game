import { useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  Download,
  FileJson,
  Landmark,
  Save,
  Settings,
  Upload,
  Wallet,
} from 'lucide-react'
import { useGameStore } from '../../store'
import { formatMoney, formatMoneyShort, formatSeasonLabel } from '../../lib'
import { Card, SectionTitle } from '../components/Card'
import { PageHeader } from '../components/PageHeader'

export function MoreScreen() {
  const navigate = useNavigate()
  const world = useGameStore((state) => state.world)
  const saveNow = useGameStore((state) => state.saveNow)
  const exportCurrent = useGameStore((state) => state.exportCurrent)
  const importFromText = useGameStore((state) => state.importFromText)
  const fileRef = useRef<HTMLInputElement>(null)
  if (!world) return null

  const user = world.players[world.playerId]
  const recentLedger = world.finance.ledger.slice(0, 6)

  return (
    <div className="page-pad pb-6">
      <PageHeader
        eyebrow={formatSeasonLabel(world.season)}
        title="更多"
        subtitle={`${user.name} · 第 ${world.week} 周`}
        right={<span className="chip">{formatMoneyShort(world.finance.balance)}</span>}
      />

      <Card className="mb-3 p-0">
        <MenuRow icon={<Landmark size={16} />} label="生涯时间线" hint="赛季记录与荣誉" onClick={() => navigate('/timeline')} />
        <MenuRow icon={<Settings size={16} />} label="设置" hint="AI、叙事与数据" onClick={() => navigate('/settings')} />
      </Card>

      <section className="mb-3">
        <SectionTitle>财务概览</SectionTitle>
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet size={16} className="text-accent" />
              <div>
                <p className="text-[10px] text-dim">可用余额</p>
                <p className="font-mono text-lg text-text">{formatMoney(world.finance.balance)}</p>
              </div>
            </div>
            <div className="text-right text-[10px] text-muted">
              <p>周薪 {formatMoneyShort(world.finance.weeklyWage)}</p>
              <p className="mt-0.5">周支出 {formatMoneyShort(world.finance.weeklyExpenses)}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {world.finance.assets.map((asset) => (
              <span key={asset} className="chip">
                {asset}
              </span>
            ))}
          </div>
        </Card>
      </section>

      <section className="mb-3">
        <SectionTitle>最近账目</SectionTitle>
        <Card className="p-0">
          {recentLedger.length === 0 ? (
            <p className="px-4 py-5 text-center text-xs text-muted">暂无账目。</p>
          ) : (
            <div className="divide-y divide-line-soft">
              {recentLedger.map((entry, index) => (
                <div key={`${entry.season}-${entry.week}-${index}`} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-[11px] text-text">{entry.label}</p>
                    <p className="text-[9px] text-dim">
                      {formatSeasonLabel(entry.season)} · 第 {entry.week} 周
                    </p>
                  </div>
                  <span className={`font-mono text-[11px] ${entry.amount >= 0 ? 'text-accent' : 'text-danger'}`}>
                    {entry.amount >= 0 ? '+' : ''}
                    {formatMoney(entry.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section className="mb-3">
        <SectionTitle>数据</SectionTitle>
        <Card className="p-0">
          <MenuRow icon={<Save size={16} />} label="立即保存" hint="写入本机 IndexedDB" onClick={() => void saveNow()} />
          <MenuRow icon={<Download size={16} />} label="导出存档" hint="JSON 文件" onClick={exportCurrent} />
          <MenuRow
            icon={<Upload size={16} />}
            label="导入存档"
            hint="选择 JSON 文件"
            onClick={() => fileRef.current?.click()}
          />
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
        </Card>
      </section>

      <section className="mb-4">
        <SectionTitle>关于</SectionTitle>
        <Card className="space-y-2 p-4 text-[11px] leading-relaxed text-muted">
          <div className="flex items-center gap-2 text-text">
            <FileJson size={14} className="text-accent" />
            绿茵人生 · Pitch Life
          </div>
          <p>
            确定性引擎负责赛程、比分、属性与合同；模板事件保证离线可玩。你也可以在设置里填入自己的
            API Key，让 AI 只负责叙事与对话，数值仍由引擎结算。
          </p>
          <p className="text-dim">
            本作为非官方作品，与任何真实联赛、俱乐部、机构或球员无关。所有俱乐部、球员与联赛名称均为化名。
          </p>
          <p className="font-mono text-[10px] text-dim">engine v{world.engineVersion} · save v{world.version}</p>
        </Card>
      </section>

      <button type="button" className="btn-secondary w-full" onClick={() => navigate('/')}>
        返回标题
      </button>
    </div>
  )
}

function MenuRow({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: ReactNode
  label: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-card-2/60"
      onClick={onClick}
    >
      <span className="text-muted">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-text">{label}</span>
        <span className="mt-0.5 block text-[10px] text-dim">{hint}</span>
      </span>
      <ChevronRight size={15} className="shrink-0 text-dim" />
    </button>
  )
}
