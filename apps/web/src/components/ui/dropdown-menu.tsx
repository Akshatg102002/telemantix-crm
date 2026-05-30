import { forwardRef } from 'react'
import * as RadixDropdown from '@radix-ui/react-dropdown-menu'
import { Check, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'

const DropdownMenu = RadixDropdown.Root
const DropdownMenuTrigger = RadixDropdown.Trigger
const DropdownMenuSeparator = RadixDropdown.Separator

const DropdownMenuContent = forwardRef<
  React.ElementRef<typeof RadixDropdown.Content>,
  React.ComponentPropsWithoutRef<typeof RadixDropdown.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <RadixDropdown.Portal>
    <RadixDropdown.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[10rem] overflow-hidden rounded-lg border border-border bg-bg-surface p-1 shadow-2xl',
        'data-[state=open]:animate-slide-up',
        className,
      )}
      {...props}
    />
  </RadixDropdown.Portal>
))
DropdownMenuContent.displayName = 'DropdownMenuContent'

const DropdownMenuItem = forwardRef<
  React.ElementRef<typeof RadixDropdown.Item>,
  React.ComponentPropsWithoutRef<typeof RadixDropdown.Item> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <RadixDropdown.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-text-secondary outline-none',
      'transition-colors hover:bg-bg-elevated hover:text-text-primary',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      inset && 'pl-8',
      className,
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = 'DropdownMenuItem'

const DropdownMenuLabel = forwardRef<
  React.ElementRef<typeof RadixDropdown.Label>,
  React.ComponentPropsWithoutRef<typeof RadixDropdown.Label>
>(({ className, ...props }, ref) => (
  <RadixDropdown.Label ref={ref} className={cn('px-2.5 py-1 text-xs font-semibold text-text-muted uppercase tracking-wider', className)} {...props} />
))
DropdownMenuLabel.displayName = 'DropdownMenuLabel'

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator }
