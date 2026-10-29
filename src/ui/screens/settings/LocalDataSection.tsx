import type { RefObject } from 'react'
import { Download, Save, Upload } from 'lucide-react'
import { formatSeasonLabel } from '../../../lib/format'
import { Card, SectionTitle } from '../../components/Card'

interface Props {
  season: number
  week: number
  fileRef: RefObject<HTMLInputElement | null>
  onSave: () => void
  onExport: () => void
  onImportFile: (file: File) => Promise<void>
  onImported: () => void
}

export function LocalDataSection({ season, week, fileRef, onSave, onExport, onImportFile, onImported }: Props) {
  return (
    <section className="mb-3">
      <SectionTitle>本地数据</SectionTitle>
      <Card className="p-0">
        <button
          type="button"
          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-card-2/60"
          onClick={onSave}
        >
          <Save size={15} className="text-muted" />
          <span className="flex-1 text-xs text-text">立即保存</span>
          <span className="text-[10px] text-dim">
            {formatSeasonLabel(season)} 第 {week} 周
          </span>
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-3 border-t border-line-soft px-4 py-3 text-left hover:bg-card-2/60"
          onClick={onExport}
        >
          <Download size={15} className="text-muted" />
          <span className="flex-1 text-xs text-text">导出当前存档</span>
          <span className="text-[10px] text-dim">JSON</span>
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-3 border-t border-line-soft px-4 py-3 text-left hover:bg-card-2/60"
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={15} className="text-muted" />
          <span className="flex-1 text-xs text-text">导入存档</span>
          <span className="text-[10px] text-dim">覆盖为新存档</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0]
            if (!file) return
            await onImportFile(file)
            onImported()
          }}
        />
      </Card>
    </section>
  )
}
