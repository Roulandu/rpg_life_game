import { Palette } from 'lucide-react'
import { useGameStore } from '../../../store'
import type { ThemePreference } from '../../../platform'
import { Card, SectionTitle } from '../../components/Card'

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
]

export function AppearanceSection() {
  const preference = useGameStore((state) => state.themePreference)
  const setThemePreference = useGameStore((state) => state.setThemePreference)

  return (
    <section className="mb-3">
      <SectionTitle right={<Palette size={14} className="text-accent" />}>外观</SectionTitle>
      <Card className="space-y-2">
        <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="主题">
          {OPTIONS.map((option) => {
            const active = preference === option.value
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                className={`min-h-11 rounded-xl border text-xs font-semibold transition ${
                  active
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-line bg-card-2 text-muted hover:text-text'
                }`}
                onClick={() => setThemePreference(option.value)}
              >
                {option.label}
              </button>
            )
          })}
        </div>
        <p className="text-[11px] leading-relaxed text-muted">
          默认跟随手机系统的深浅色；手动选择会覆盖系统设置。
        </p>
      </Card>
    </section>
  )
}
