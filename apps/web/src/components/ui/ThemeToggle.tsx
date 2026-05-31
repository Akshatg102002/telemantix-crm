import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '../../store/theme'
import { cn } from '../../lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useThemeStore()
  return (
    <button
      onClick={toggleTheme}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={cn(
        'h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200',
        'text-text-secondary hover:text-text-primary hover:bg-bg-elevated',
        className,
      )}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
