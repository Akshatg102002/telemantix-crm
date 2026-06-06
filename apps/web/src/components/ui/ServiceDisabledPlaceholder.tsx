import { Lock } from 'lucide-react'

interface Props {
  serviceName?: string
  message?: string
}

export function ServiceDisabledPlaceholder({ serviceName, message }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center">
      <div className="h-14 w-14 rounded-full bg-text-muted/10 flex items-center justify-center mb-4">
        <Lock className="h-6 w-6 text-text-muted" />
      </div>
      <h3 className="font-heading font-semibold text-text-primary mb-2">
        {serviceName ? `${serviceName} is not available` : 'Feature not available'}
      </h3>
      <p className="text-text-secondary text-sm max-w-sm">
        {message || 'Contact support to enable this feature for your workspace.'}
      </p>
    </div>
  )
}
