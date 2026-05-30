import { useState } from 'react'
import { motion } from 'framer-motion'
import { DndContext, DragEndEvent, DragOverlay, closestCorners, useDraggable, useDroppable } from '@dnd-kit/core'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Select } from '../components/ui/select'
import { useServiceBoards } from '../hooks/useApi'
import { formatCurrency } from '../lib/utils'

interface Lead {
  id: string
  name: string
  phone: string
  dealValue?: number
  score: number
  assignedUser?: { name: string }
  source?: { name: string }
}

interface Status {
  id: string
  name: string
  color: string
  leads: Lead[]
}

function LeadCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.5 : 1 } : undefined}
      className="bg-bg-surface border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-brand-purple/40 hover:shadow-card-hover transition-all"
    >
      <p className="text-xs font-medium text-text-primary">{lead.name}</p>
      <p className="text-[10px] text-text-muted mt-0.5">{lead.phone}</p>
      <div className="flex items-center justify-between mt-2">
        {lead.dealValue ? (
          <span className="text-[10px] text-success font-medium">{formatCurrency(lead.dealValue)}</span>
        ) : <span />}
        <span className="text-[10px] text-text-muted">{lead.assignedUser?.name || 'Unassigned'}</span>
      </div>
    </div>
  )
}

function StatusColumn({ status, leads }: { status: Status; leads: Lead[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id })
  const total = leads.reduce((s, l) => s + (l.dealValue || 0), 0)

  return (
    <div className="flex flex-col min-w-[220px] w-[220px]">
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="h-2 w-2 rounded-full" style={{ background: status.color }} />
        <span className="text-xs font-medium text-text-primary">{status.name}</span>
        <Badge variant="secondary" className="text-[9px] ml-auto">{leads.length}</Badge>
      </div>
      {total > 0 && <p className="text-[10px] text-success mb-2 px-1">{formatCurrency(total)}</p>}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[400px] rounded-xl p-2 space-y-2 transition-colors ${isOver ? 'bg-brand-purple/10 border border-brand-purple/30' : 'bg-bg-surface/50 border border-border'}`}
      >
        {leads.map(lead => <LeadCard key={lead.id} lead={lead} />)}
        {leads.length === 0 && (
          <div className="h-20 rounded-lg border border-dashed border-border flex items-center justify-center">
            <span className="text-[10px] text-text-muted">Drop here</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function PipelinePage() {
  const qc = useQueryClient()
  const { data: boards } = useServiceBoards()
  const [boardId, setBoardId] = useState('')

  const { data: statuses } = useQuery({
    queryKey: ['pipeline', boardId],
    queryFn: () => api.get('/leads/pipeline', { params: { serviceBoardId: boardId || undefined } }).then(r => r.data.data),
    enabled: true,
  })

  const moveLeadMutation = useMutation({
    mutationFn: ({ leadId, statusId }: { leadId: string; statusId: string }) =>
      api.patch(`/leads/${leadId}`, { statusId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline'] }),
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      moveLeadMutation.mutate({ leadId: String(active.id), statusId: String(over.id) })
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Select className="h-8 text-xs w-48" value={boardId} onChange={e => setBoardId(e.target.value)}>
          <option value="">All Boards</option>
          {(boards || []).map((b: { id: string; name: string }) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </Select>
      </div>

      <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {(statuses || []).map((s: Status) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <StatusColumn status={s} leads={s.leads || []} />
            </motion.div>
          ))}
          {!statuses?.length && (
            <div className="flex-1 flex items-center justify-center h-64 text-text-muted text-sm">
              Select a service board to view pipeline
            </div>
          )}
        </div>
        <DragOverlay />
      </DndContext>
    </div>
  )
}
