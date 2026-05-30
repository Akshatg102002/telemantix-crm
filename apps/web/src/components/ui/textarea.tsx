import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }>(
  ({ className, error, ...props }, ref) => (
    <div className="w-full">
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-y',
          'transition-all duration-200 outline-none',
          'focus:border-brand-purple/60 focus:ring-2 focus:ring-brand-purple/20',
          error && 'border-danger/60',
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  ),
)
Textarea.displayName = 'Textarea'

export { Textarea }
