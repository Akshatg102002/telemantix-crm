import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, icon, error, ...props }, ref) => (
  <div className="relative w-full">
    {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">{icon}</span>}
    <input
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted',
        'transition-all duration-200 outline-none',
        'focus:border-brand-purple/60 focus:ring-2 focus:ring-brand-purple/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        error && 'border-danger/60 focus:border-danger focus:ring-danger/20',
        icon && 'pl-9',
        className,
      )}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-danger">{error}</p>}
  </div>
))
Input.displayName = 'Input'

export { Input }
