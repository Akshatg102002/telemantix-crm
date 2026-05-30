import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, error, children, ...props }, ref) => (
  <div className="relative w-full">
    <select
      ref={ref}
      className={cn(
        'flex h-9 w-full appearance-none rounded-lg border border-border bg-bg-elevated px-3 py-2 pr-8 text-sm text-text-primary',
        'transition-all duration-200 outline-none cursor-pointer',
        'focus:border-brand-purple/60 focus:ring-2 focus:ring-brand-purple/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        error && 'border-danger/60',
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
    {error && <p className="mt-1 text-xs text-danger">{error}</p>}
  </div>
))
Select.displayName = 'Select'

export { Select }
