import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-brand-purple/20 text-brand-purple border border-brand-purple/30',
        success: 'bg-success/15 text-success border border-success/30',
        warning: 'bg-warning/15 text-warning border border-warning/30',
        danger: 'bg-danger/15 text-danger border border-danger/30',
        secondary: 'bg-bg-elevated text-text-secondary border border-border',
        outline: 'border border-border text-text-secondary',
        coral: 'bg-brand-coral/15 text-brand-coral border border-brand-coral/30',
        magenta: 'bg-brand-magenta/15 text-brand-magenta border border-brand-magenta/30',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
