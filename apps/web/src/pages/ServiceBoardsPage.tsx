import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, GripVertical, ChevronDown, ChevronRight } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useToast } from '../components/ui/toast'

interface Status {
  id: string
  name: string
  color: string
  sortOrder: number
  subStatuses: { id: string; name: string; color: string }[]
}

interface Board {
  id: string
  name: string
  description?: string
  color: string
  isActive: boolean
  statuses: Status[]
  _count?: { leads: number }
}

export function ServiceBoardsPage() {
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', color: '#7B2FBE' })

  const { data: boards, isLoading } = useQuery({
    queryKey: ['service-boards-detail'],
    queryFn: () => api.get('/service-boards?include=statuses').then(r => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: () => api.post('/service-boards', form),
    onSuccess: () => {
      success('Service board created')
      setShowCreate(false)
      setForm({ name: '', description: '', color: '#7B2FBE' })
      qc.invalidateQueries({ queryKey: ['service-boards-detail'] })
    },
    onError: () => toastError('Failed to create board'),
  })

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-semibold text-text-primary">Service Boards</h2>
          <p className="text-text-secondary text-xs mt-0.5">Organize leads by business vertical with custom pipelines</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5" /> New Board
        </Button>
      </div>

      {isLoading && <div className="text-center text-text-muted text-sm py-12">Loading...</div>}

      <div className="space-y-3">
        {(boards || []).map((board: Board, i: number) => (
          <motion.div key={board.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card gradient={board.isActive}>
              <CardContent className="p-0">
                <button
                  className="w-full flex items-center gap-3 p-4 text-left"
                  onClick={() => setExpanded(expanded === board.id ? null : board.id)}
                >
                  <div className="h-4 w-4 rounded-sm shrink-0" style={{ background: board.color }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">{board.name}</span>
                      <Badge variant="secondary" className="text-[9px]">{board._count?.leads || 0} leads</Badge>
                      <Badge variant={board.isActive ? 'success' : 'secondary'} className="text-[9px]">
                        {board.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {board.description && <p className="text-xs text-text-muted mt-0.5">{board.description}</p>}
                  </div>
                  {expanded === board.id ? <ChevronDown className="h-4 w-4 text-text-muted" /> : <ChevronRight className="h-4 w-4 text-text-muted" />}
                </button>

                {expanded === board.id && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="border-t border-border px-4 pb-4">
                    <div className="pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-text-secondary">Status Pipeline</p>
                        <Button size="sm" variant="secondary" className="text-xs h-6">
                          <Plus className="h-3 w-3" /> Add Status
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(board.statuses || []).map(status => (
                          <div key={status.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-bg-elevated">
                            <GripVertical className="h-3 w-3 text-text-muted cursor-grab" />
                            <div className="h-2 w-2 rounded-full" style={{ background: status.color }} />
                            <span className="text-xs text-text-primary">{status.name}</span>
                            {status.subStatuses?.length > 0 && (
                              <Badge variant="secondary" className="text-[9px]">{status.subStatuses.length} sub</Badge>
                            )}
                          </div>
                        ))}
                        {!board.statuses?.length && (
                          <p className="text-xs text-text-muted">No statuses configured yet</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {!isLoading && !boards?.length && (
          <Card>
            <CardContent className="p-12 text-center text-text-muted text-sm">No service boards yet</CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Service Board</DialogTitle></DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Board Name</Label>
              <Input placeholder="e.g. Real Estate" value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="Optional description" value={form.description} onChange={e => setForm(v => ({ ...v, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={e => setForm(v => ({ ...v, color: e.target.value }))} className="h-9 w-14 rounded-lg border border-border bg-bg-elevated cursor-pointer" />
                <Input value={form.color} onChange={e => setForm(v => ({ ...v, color: e.target.value }))} className="font-mono text-xs" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!form.name}>
              Create Board
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
