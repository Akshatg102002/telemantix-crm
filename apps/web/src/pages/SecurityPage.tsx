import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Shield, Clock, Smartphone, AlertCircle, Check, LogOut, Lock, Eye, EyeOff, Key } from 'lucide-react'
import { api } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useToast } from '../components/ui/toast'
import { formatDate } from '../lib/utils'

const TABS = ['Login History', 'Sessions', '2FA', 'Audit Log', 'Permissions'] as const
type Tab = typeof TABS[number]

interface LoginRecord { id: string; ipAddress?: string; userAgent?: string; status: string; createdAt: string }
interface Session { id: string; ipAddress?: string; userAgent?: string; deviceName?: string; lastActiveAt: string; createdAt: string }
interface AuditEntry { id: string; action: string; resource: string; resourceId?: string; ipAddress?: string; createdAt: string }

export function SecurityPage() {
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('Login History')
  const [qrSetup, setQrSetup] = useState<{ qrDataUrl: string; secret: string; backupCodes: string[] } | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [currentPw, setCurrentPw] = useState('')

  const { data: loginHistory } = useQuery<LoginRecord[]>({
    queryKey: ['login-history'],
    queryFn: () => api.get('/settings/login-history').then(r => r.data.data),
    enabled: tab === 'Login History',
  })

  const { data: sessions } = useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn: () => api.get('/settings/sessions').then(r => r.data.data),
    enabled: tab === 'Sessions',
  })

  const { data: auditData } = useQuery({
    queryKey: ['audit-log'],
    queryFn: () => api.get('/settings/audit-log').then(r => r.data),
    enabled: tab === 'Audit Log',
  })

  const auditLogs: AuditEntry[] = auditData?.data || []

  const revokeSession = useMutation({
    mutationFn: (id: string) => api.delete(`/settings/sessions/${id}`),
    onSuccess: () => { success('Session revoked'); qc.invalidateQueries({ queryKey: ['sessions'] }) },
  })

  const revokeAllOthers = useMutation({
    mutationFn: () => api.delete('/settings/sessions'),
    onSuccess: () => { success('All other sessions revoked'); qc.invalidateQueries({ queryKey: ['sessions'] }) },
  })

  const setup2FA = useMutation({
    mutationFn: () => api.post('/auth/2fa/setup'),
    onSuccess: (res) => setQrSetup(res.data.data),
    onError: () => toastError('Failed to setup 2FA'),
  })

  const verify2FA = useMutation({
    mutationFn: () => api.post('/auth/2fa/verify', { code: verifyCode }),
    onSuccess: () => { success('2FA enabled successfully!'); setQrSetup(null); setVerifyCode('') },
    onError: () => toastError('Invalid 2FA code'),
  })

  const disable2FA = useMutation({
    mutationFn: () => api.post('/auth/2fa/disable', { password: currentPw }),
    onSuccess: () => { success('2FA disabled'); setCurrentPw('') },
    onError: () => toastError('Failed to disable 2FA. Check your password.'),
  })

  const parseUA = (ua?: string) => {
    if (!ua) return 'Unknown device'
    if (ua.includes('Chrome')) return 'Chrome'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Safari')) return 'Safari'
    return 'Browser'
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div>
        <h1 className="font-heading font-bold text-xl text-text-primary flex items-center gap-2">
          <Shield className="h-5 w-5 text-brand-purple" /> Security
        </h1>
        <p className="text-text-secondary text-xs mt-0.5">Manage your account security settings</p>
      </div>

      <div className="flex border-b border-border gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t ? 'border-brand-purple text-brand-purple' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Login History */}
      {tab === 'Login History' && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> Recent Login Activity</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(loginHistory || []).map((r, i) => (
                <motion.div key={r.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0 text-xs">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${r.status === 'success' ? 'bg-success' : 'bg-danger'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-text-primary font-medium">{r.ipAddress || '—'}</span>
                      <Badge variant={r.status === 'success' ? 'success' : 'danger'} className="text-[9px]">{r.status}</Badge>
                    </div>
                    <p className="text-text-muted truncate">{parseUA(r.userAgent)}</p>
                  </div>
                  <span className="text-text-muted shrink-0">{formatDate(r.createdAt, 'time')}</span>
                </motion.div>
              ))}
              {!loginHistory?.length && <p className="text-text-muted text-sm text-center py-6">No login history available</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions */}
      {tab === 'Sessions' && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Smartphone className="h-4 w-4" /> Active Sessions</CardTitle>
            <Button size="sm" variant="secondary" onClick={() => revokeAllOthers.mutate()} loading={revokeAllOthers.isPending}>
              <LogOut className="h-3.5 w-3.5" /> Revoke All Others
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(sessions || []).map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border border-border text-xs">
                  <Smartphone className="h-4 w-4 text-text-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary font-medium">{s.deviceName || parseUA(s.userAgent)}</p>
                    <p className="text-text-muted">{s.ipAddress || '—'} · Last active {formatDate(s.lastActiveAt, 'time')}</p>
                  </div>
                  {i === 0 && <Badge variant="success" className="text-[9px] shrink-0">Current</Badge>}
                  {i > 0 && (
                    <Button size="sm" variant="secondary" className="h-6 text-xs px-2" onClick={() => revokeSession.mutate(s.id)}>
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
              {!sessions?.length && <p className="text-text-muted text-sm text-center py-6">No active sessions found</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2FA */}
      {tab === '2FA' && (
        <div className="space-y-4">
          <Card gradient>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Key className="h-4 w-4 text-brand-purple" /> Two-Factor Authentication</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {!qrSetup ? (
                <>
                  <p className="text-sm text-text-secondary">Add an extra layer of security to your account. You'll need an authenticator app like Google Authenticator or Authy.</p>
                  <div className="flex gap-3">
                    <Button size="sm" onClick={() => setup2FA.mutate()} loading={setup2FA.isPending}>
                      Setup 2FA
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => disable2FA.mutate()} loading={disable2FA.isPending}>
                      Disable 2FA
                    </Button>
                  </div>
                  {disable2FA.isPending && (
                    <div className="space-y-1.5">
                      <Label>Confirm Password</Label>
                      <Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Your current password" />
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-text-secondary">Scan this QR code with your authenticator app:</p>
                  <div className="p-4 bg-white rounded-xl inline-block">
                    <div className="h-32 w-32 bg-gray-200 flex items-center justify-center text-xs text-gray-500 text-center">
                      [QR Code]<br />Use secret below
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Secret Key (enter manually if QR fails)</Label>
                    <Input readOnly value={qrSetup.secret} className="font-mono text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Enter 6-digit verification code *</Label>
                    <Input placeholder="123456" maxLength={6} value={verifyCode} onChange={e => setVerifyCode(e.target.value)} className="font-mono" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => verify2FA.mutate()} loading={verify2FA.isPending} disabled={verifyCode.length !== 6}>
                      <Check className="h-3.5 w-3.5" /> Verify & Enable
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setQrSetup(null)}>Cancel</Button>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted font-medium mb-1">Backup Codes (save these!)</p>
                    <div className="grid grid-cols-4 gap-1">
                      {qrSetup.backupCodes.map(code => (
                        <code key={code} className="text-[10px] bg-bg-elevated border border-border rounded px-1.5 py-1 text-center text-text-secondary">{code}</code>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Audit Log */}
      {tab === 'Audit Log' && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Activity Audit Log</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {auditLogs.map((log, i) => (
                <div key={log.id} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0 text-xs">
                  <div className="h-6 w-6 rounded-lg bg-brand-purple/10 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle className="h-3 w-3 text-brand-purple" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-text-primary">{log.action}</span>
                      <span className="text-text-muted">on</span>
                      <span className="text-brand-purple">{log.resource}</span>
                      {log.resourceId && <span className="text-text-muted font-mono">(#{log.resourceId.slice(0, 8)})</span>}
                    </div>
                    {log.ipAddress && <p className="text-text-muted">from {log.ipAddress}</p>}
                  </div>
                  <span className="text-text-muted shrink-0">{formatDate(log.createdAt, 'time')}</span>
                </div>
              ))}
              {!auditLogs.length && <p className="text-text-muted text-sm text-center py-6">No audit entries</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Permissions */}
      {tab === 'Permissions' && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Lock className="h-4 w-4" /> Permission Matrix</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-3 text-left text-text-muted">Resource</th>
                    {['Admin', 'Manager', 'Agent'].map(r => <th key={r} className="p-3 text-center text-text-muted">{r}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { resource: 'Leads', admin: '✓', manager: '✓', agent: '✓' },
                    { resource: 'Bulk Actions', admin: '✓', manager: '✓', agent: '✗' },
                    { resource: 'Users', admin: '✓', manager: '✗', agent: '✗' },
                    { resource: 'Integrations', admin: '✓', manager: '✓', agent: '✗' },
                    { resource: 'Automation', admin: '✓', manager: '✓', agent: '✗' },
                    { resource: 'Analytics', admin: '✓', manager: '✓', agent: '✗' },
                    { resource: 'API Keys', admin: '✓', manager: '✗', agent: '✗' },
                    { resource: 'Billing', admin: '✓', manager: '✗', agent: '✗' },
                    { resource: 'Settings', admin: '✓', manager: '✗', agent: '✗' },
                  ].map(row => (
                    <tr key={row.resource} className="border-b border-border/50 hover:bg-bg-elevated/50">
                      <td className="p-3 font-medium text-text-primary">{row.resource}</td>
                      {['admin', 'manager', 'agent'].map(role => (
                        <td key={role} className={`p-3 text-center font-bold ${(row as Record<string,string>)[role] === '✓' ? 'text-success' : 'text-text-muted'}`}>
                          {(row as Record<string,string>)[role]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
