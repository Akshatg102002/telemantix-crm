import * as RadixTooltip from '@radix-ui/react-tooltip'
import { cn } from '../../lib/utils'

const TooltipProvider = RadixTooltip.Provider
const Tooltip = RadixTooltip.Root
const TooltipTrigger = RadixTooltip.Trigger

const TooltipContent = ({ className, sideOffset = 4, ...props }: React.ComponentPropsWithoutRef<typeof RadixTooltip.Content>) => (
  <RadixTooltip.Content
    sideOffset={sideOffset}
    className={cn(
      'z-50 rounded-md bg-bg-elevated border border-border px-2.5 py-1.5 text-xs text-text-primary shadow-lg',
      'animate-fade-in',
      className,
    )}
    {...props}
  />
)

export { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent }
