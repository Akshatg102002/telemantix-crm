import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, LineChart, Line, FunnelChart, Funnel, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell, LabelList
} from 'recharts'
import { useAnalytics } from '../hooks/useApi'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'

const TABS = ['Overview', 'Funnel', 'Agent Performance', 'Call Insights'] as const
type Tab = typeof TABS[number]

const COLORS = ['#7B2FBE', '#C43E8A', '#E8622A', '#22C55E', '#F59E0B']

export function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('Overview')
  const { data: overview } = useAnalytics('overview')
  const { data: funnel } = useAnalytics('funnel')
  const { data: agents } = useAnalytics('agents')

  const conversionTrend = overview?.conversionTrend || []
  const revenuePipeline = overview?.revenuePipeline || []

  return (
    <div className="p-6 space-y-5">
      <div className="flex border-b border-border gap-1">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              tab === t ? 'border-brand-purple text-brand-purple' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {tab === 'Overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card gradient>
                <CardHeader><CardTitle className="text-sm">Conversion Trend</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={conversionTrend}>
                      <XAxis dataKey="date" tick={{ fill: '#8A8A99', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#8A8A99', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#16161A', border: '1px solid #2A2A2F', borderRadius: 8, fontSize: 12 }} />
                      <Line type="monotone" dataKey="leads" stroke="#7B2FBE" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="converted" stroke="#22C55E" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card gradient>
                <CardHeader><CardTitle className="text-sm">Revenue Pipeline by Stage</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenuePipeline} layout="vertical">
                      <XAxis type="number" tick={{ fill: '#8A8A99', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="stage" tick={{ fill: '#8A8A99', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip contentStyle={{ background: '#16161A', border: '1px solid #2A2A2F', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="value" fill="#7B2FBE" radius={4}>
                        {revenuePipeline.map((_: unknown, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {tab === 'Funnel' && (
          <Card gradient>
            <CardHeader><CardTitle className="text-sm">Lead Funnel</CardTitle></CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <Tooltip contentStyle={{ background: '#16161A', border: '1px solid #2A2A2F', borderRadius: 8, fontSize: 12 }} />
                  <Funnel dataKey="value" data={funnel || []} isAnimationActive>
                    <LabelList position="right" fill="#F5F5F7" stroke="none" dataKey="name" style={{ fontSize: 12 }} />
                    {(funnel || []).map((_: unknown, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {tab === 'Agent Performance' && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Agent Performance</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-3 text-left text-text-muted font-medium">Agent</th>
                      <th className="p-3 text-left text-text-muted font-medium">Leads Assigned</th>
                      <th className="p-3 text-left text-text-muted font-medium">Converted</th>
                      <th className="p-3 text-left text-text-muted font-medium">Conversion %</th>
                      <th className="p-3 text-left text-text-muted font-medium">Follow-ups Done</th>
                      <th className="p-3 text-left text-text-muted font-medium">Avg Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(agents || []).map((a: { userId: string; name: string; assigned: number; converted: number; followUpsDone: number; avgResponseHours: number }) => (
                      <tr key={a.userId} className="border-b border-border/50 hover:bg-bg-elevated/50">
                        <td className="p-3 font-medium text-text-primary">{a.name}</td>
                        <td className="p-3 text-text-secondary">{a.assigned}</td>
                        <td className="p-3 text-success">{a.converted}</td>
                        <td className="p-3">
                          <Badge variant={a.converted / a.assigned > 0.3 ? 'success' : 'warning'}>
                            {a.assigned ? ((a.converted / a.assigned) * 100).toFixed(1) : 0}%
                          </Badge>
                        </td>
                        <td className="p-3 text-text-secondary">{a.followUpsDone}</td>
                        <td className="p-3 text-text-secondary">{a.avgResponseHours?.toFixed(1)}h</td>
                      </tr>
                    ))}
                    {!agents?.length && (
                      <tr><td colSpan={6} className="p-8 text-center text-text-muted">No agent data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {tab === 'Call Insights' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Calls', value: '—', sub: 'Connect IVR to see data' },
              { label: 'Avg Duration', value: '—', sub: 'minutes' },
              { label: 'Missed Calls', value: '—', sub: 'No answer' },
            ].map(k => (
              <Card key={k.label} gradient>
                <CardContent className="p-5 text-center">
                  <p className="text-text-secondary text-xs">{k.label}</p>
                  <p className="font-heading font-bold text-3xl text-text-primary mt-1">{k.value}</p>
                  <p className="text-text-muted text-xs mt-1">{k.sub}</p>
                </CardContent>
              </Card>
            ))}
            <div className="col-span-3">
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-text-muted text-sm">Connect your Exotel IVR integration to see call analytics</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
