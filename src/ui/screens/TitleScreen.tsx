import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload } from 'lucide-react'
import { useGameStore } from '../../store'
import { ThemeToggle } from '../components/ThemeToggle'
import { TitleAside } from './title/TitleAside'
import { TitleHero } from './title/TitleHero'

export function TitleScreen() {
  const navigate = useNavigate()
  const importFromText = useGameStore((state) => state.importFromText)
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="app-shell px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))] sm:max-w-[var(--focus-max)] lg:max-w-[960px]">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl border border-accent/30 bg-accent/10">
            <span className="font-mono text-[13px] font-bold text-accent">PL</span>
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-text">绿茵人生</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-dim">Pitch Life</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            className="btn-ghost px-3 text-[11px]"
            aria-label="导入存档"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={16} /> 导入
          </button>
        </div>
      </header>

      <div
        data-testid="title-grid"
        className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-6"
      >
        <TitleHero />
        <div data-testid="title-aside">
          <TitleAside onImport={() => fileRef.current?.click()} />
        </div>
      </div>

      <footer className="mt-8 px-2 text-center text-[10px] leading-relaxed text-dim">
        <p>非官方作品，与任何真实联赛、俱乐部或机构无关。联赛、俱乐部与球员均为化名。</p>
        <p className="mt-1">v0.1 · 确定性引擎 + 模板事件</p>
      </footer>

      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0]
          if (!file) return
          const text = await file.text()
          const ok = await importFromText(text)
          event.target.value = ''
          if (ok) navigate('/game')
        }}
      />
    </div>
  )
}
