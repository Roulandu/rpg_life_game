import { Moon, Sun } from 'lucide-react'
import { selectResolvedTheme, useGameStore } from '../../store'

export function ThemeToggle() {
  const theme = useGameStore(selectResolvedTheme)
  const toggleTheme = useGameStore((state) => state.toggleTheme)
  const dark = theme === 'dark'

  return (
    <button
      type="button"
      className="btn-ghost px-2"
      aria-label={dark ? '切换到浅色模式' : '切换到深色模式'}
      onClick={toggleTheme}
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}
