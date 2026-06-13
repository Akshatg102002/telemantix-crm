import { useQuery } from '@tanstack/react-query'
import { Mail, Send } from 'lucide-react'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { api } from '../lib/api'
import { relativeTime } from '../lib/utils'

interface EmailLog {
  id: string
  to: string
  from: string
  subject: string
  provider: string
  status: string
  providerMessageId?: string
  createdAt: string
}

export function EmailSettingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['email-settings'],
    queryFn: () => api.get('/email/settings').then(r => r.data.data),
  })

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="font-heading font-semibold text-text-primary">Email Settings</h2>
        <p className="text-text-secondary text-xs mt-0.5">Review your tenant email provider and recent delivery activity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card gradient>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center"><Mail className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-text-muted">Connected provider</p>
              <p className="text-sm font-medium text-text-primary">{data?.connectedProvider || 'Not connected'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 text-success flex items-center justify-center"><Send className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-text-muted">Sender email</p>
              <p className="text-sm font-medium text-text-primary">{data?.senderEmail || 'Not configured'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-elevated text-text-secondary text-xs">
              <tr>
                <th className="text-left p-3 font-medium">Recipient</th>
                <th className="text-left p-3 font-medium">Subject</th>
                <th className="text-left p-3 font-medium">Provider</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Sent</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td className="p-4 text-text-secondary" colSpan={5}>Loading email logs...</td></tr>}
              {!isLoading && (data?.emails || []).length === 0 && <tr><td className="p-4 text-text-secondary" colSpan={5}>No sent emails yet.</td></tr>}
              {(data?.emails || []).map((email: EmailLog) => (
                <tr key={email.id} className="border-t border-border">
                  <td className="p-3 text-text-primary">{email.to}</td>
                  <td className="p-3 text-text-primary">{email.subject}</td>
                  <td className="p-3 text-text-secondary capitalize">{email.provider}</td>
                  <td className="p-3"><Badge variant={email.status === 'failed' ? 'danger' : 'success'}>{email.status}</Badge></td>
                  <td className="p-3 text-text-secondary">{relativeTime(email.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
