import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Phone, Mail, Edit2, Clock, History, CheckSquare, Plus, MessageSquare } from 'lucide-react'
import { useLead } from '../hooks/useApi'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { formatDate, relativeTime, scoreColor, scoreLabel } from '../lib/utils'

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'overview' | 'followups' | 'history' | 'tasks'>('overview')
  const { data: lead, isLoading } = useLead(id!)

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="h-6 w-6 rounded-full border-2 border-brand-purple border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="p-6 text-center text-text-muted">
        <p>Lead not found</p>
        <Button variant="ghost" className="mt-2" onClick={() => navigate('/leads')}>Back to Leads</Button>
      </div>
    )
  }

  const tabs = [
    { key: 'overview', label: 'Overview', icon: Edit2 },
    { key: 'followups', label: 'Follow-ups', icon: Clock },
    { key: 'tasks', label: 'Tasks', icon: CheckSquare },
    { key: 'history', label: 'History', icon: History },
  ] as const

  return (
    <div className="p-6 space-y-5">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate('/leads')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-heading font-bold text-xl text-text-primary">{lead.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            {lead.status && <Badge>{lead.status.name}</Badge>}
            {lead.isStale && <Badge variant="warning">Stale</Badge>}
            {lead.reEnquiredCount > 0 && <Badge variant="coral">Re-enquired ×{lead.reEnquiredCount}</Badge>}
            <span className={`text-xs font-medium ${scoreColor(lead.score)}`}>
              Score: {lead.score} ({scoreLabel(lead.score)})
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary">
            <Phone className="h-3.5 w-3.5" /> Call
          </Button>
          <Button size="sm" variant="secondary">
            <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
          </Button>
          <Button size="sm">
            <Edit2 className="h-3.5 w-3.5" /> Edit
          </Button>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card gradient>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-brand-purple" />
              <span className="text-text-primary font-medium">{lead.phone}</span>
            </div>
            {lead.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-brand-purple" />
                <span className="text-text-primary">{lead.email}</span>
              </div>
            )}
            <div className="text-xs text-text-secondary">Added {relativeTime(lead.createdAt)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Source</span>
              <span className="text-text-primary">{lead.source?.name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Board</span>
              <span className="text-text-primary">{lead.serviceBoard?.name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Assigned</span>
              <span className="text-text-primary">{lead.assignedUser?.name || 'Unassigned'}</span>
            </div>
            {lead.dealValue && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Deal Value</span>
                <span className="text-success font-semibold">₹{lead.dealValue.toLocaleString('en-IN')}</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            {lead.notes ? (
              <p className="text-sm text-text-secondary leading-relaxed">{lead.notes}</p>
            ) : (
              <p className="text-sm text-text-muted italic">No notes added</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-brand-purple text-brand-purple'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {activeTab === 'history' && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Activity History</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(lead.histories || []).map((h: { id: string; event: string; field?: string; oldValue?: string; newValue?: string; user?: { name: string }; note?: string; createdAt: string }) => (
                  <div key={h.id} className="flex gap-3 text-xs">
                    <div className="h-1.5 w-1.5 rounded-full bg-brand-purple mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <span className="text-text-primary font-medium">{h.user?.name || 'System'}</span>
                      <span className="text-text-secondary"> {h.event}</span>
                      {h.field && (
                        <span className="text-text-muted">
                          {' '}({h.field}: <span className="line-through">{h.oldValue}</span> → <span className="text-success">{h.newValue}</span>)
                        </span>
                      )}
                      {h.note && <p className="text-text-muted mt-0.5 italic">{h.note}</p>}
                    </div>
                    <span className="text-text-muted shrink-0">{formatDate(h.createdAt, 'time')}</span>
                  </div>
                ))}
                {!lead.histories?.length && <p className="text-text-muted text-xs text-center py-6">No history yet</p>}
              </div>
            </CardContent>
          </Card>
        )}
        {activeTab === 'followups' && (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-sm">Follow-ups</CardTitle>
              <Button size="sm"><Plus className="h-3.5 w-3.5" /> Add</Button>
            </CardHeader>
            <CardContent>
              {(lead.followUps || []).length === 0 && <p className="text-text-muted text-xs text-center py-6">No follow-ups scheduled</p>}
              <div className="space-y-3">
                {(lead.followUps || []).map((f: { id: string; type: string; status: string; scheduledAt: string; note?: string }) => (
                  <div key={f.id} className="flex items-start gap-3 p-3 rounded-lg border border-border text-xs">
                    <div className={`h-2 w-2 rounded-full mt-1 ${f.status === 'done' ? 'bg-success' : f.status === 'missed' ? 'bg-danger' : 'bg-warning'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-text-primary font-medium capitalize">{f.type}</span>
                        <Badge variant={f.status === 'done' ? 'success' : f.status === 'missed' ? 'danger' : 'warning'} className="text-[9px]">
                          {f.status}
                        </Badge>
                      </div>
                      <p className="text-text-secondary mt-0.5">{formatDate(f.scheduledAt, 'time')}</p>
                      {f.note && <p className="text-text-muted mt-1 italic">{f.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {activeTab === 'tasks' && (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-sm">Tasks</CardTitle>
              <Button size="sm"><Plus className="h-3.5 w-3.5" /> Add Task</Button>
            </CardHeader>
            <CardContent>
              {(lead.tasks || []).length === 0 && <p className="text-text-muted text-xs text-center py-6">No tasks linked</p>}
            </CardContent>
          </Card>
        )}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card gradient>
              <CardHeader><CardTitle className="text-sm">Lead Score Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-secondary">Overall Score</span>
                      <span className={`font-bold ${scoreColor(lead.score)}`}>{lead.score}/100</span>
                    </div>
                    <div className="h-2 rounded-full bg-bg-elevated overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-gradient transition-all duration-700"
                        style={{ width: `${lead.score}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Custom Fields</CardTitle></CardHeader>
              <CardContent>
                {(lead.customFieldValues || []).length === 0 ? (
                  <p className="text-text-muted text-xs">No custom fields configured</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {lead.customFieldValues.map((cfv: { id: string; customField: { name: string }; value: unknown }) => (
                      <div key={cfv.id} className="flex justify-between">
                        <span className="text-text-secondary">{cfv.customField.name}</span>
                        <span className="text-text-primary">{String(cfv.value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>
    </div>
  )
}
