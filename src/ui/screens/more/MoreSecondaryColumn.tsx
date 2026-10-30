import { Download, FileJson, Save, Upload } from 'lucide-react'
import type { WorldState } from '../../../domain'
import { formatMoney, formatSeasonLabel } from '../../../lib'
import { useGameStore } from '../../../store'
import { Card, SectionTitle } from '../../components/Card'
import { MenuRow } from './MenuRow'

export function MoreSecondaryColumn({ world, onImport }: { world: WorldState; onImport: () => void }) {
  const saveNow = useGameStore((state) => state.saveNow)
  const exportCurrent = useGameStore((state) => state.exportCurrent)
  const recentLedger = world.finance.ledger.slice(0, 6)

  return (
    <>
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
          <MenuRow icon={<Upload size={16} />} label="导入存档" hint="选择 JSON 文件" onClick={onImport} />
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
    </>
  )
}
