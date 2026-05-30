import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, CheckSquare, Circle, AlertTriangle, Clock } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTasks, useUsers } from '../hooks/useApi'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Select } from '../components/ui/select'
import { useToast } from '../components/ui/toast'
import { api } from '../lib/api'
import { formatDate } from '../lib/utils'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  dueDate?: string
  completedAt?: string
  lead?: { id: string; name: string }
  assignedUser?: { name: string }
}

const priorityConfig = {
  low: { color: 'secondary' as const, icon: Circle },
  medium: { color: 'warning' as const, icon: Clock },
  high: { color: 'danger' as const, icon: AlertTriangle },
  urgent: { color: 'coral' as const, icon: AlertTriangle },
}

export function TasksPage() {
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()
  const [filter, setFilter] = useState('open')
  const { data, isLoading } = useTasks({ status: filter || undefined })
  const tasks: Task[] = data?.data || []

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/tasks/${id}`, { status: 'done' }),
    onSuccess: () => { success('Task completed'); qc.invalidateQueries({ queryKey: ['tasks'] }) },
    onError: () => toastError('Failed to update task'),
  })

  const overdue = tasks.filter(t => t.dueDate && t.status !== 'done' && new Date(t.dueDate) < new Date()).length

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-semibold text-text-primary">Tasks</h2>
          {overdue > 0 && <p className="text-danger text-xs mt-0.5">{overdue} overdue tasks</p>}
        </div>
        <Button size="sm">
          <Plus className="h-3.5 w-3.5" /> New Task
        </Button>
      </div>

      <div className="flex gap-2">
        {['open', 'done', ''].map(s => (
          <Button key={s || 'all'} size="sm" variant={filter === s ? 'default' : 'secondary'} onClick={() => setFilter(s)}>
            {s === '' ? 'All' : s === 'open' ? 'Open' : 'Done'}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <div className="h-5 w-5 rounded-full border-2 border-brand-purple border-t-transparent animate-spin" />
          </div>
        )}
        {!isLoading && tasks.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckSquare className="h-8 w-8 text-text-muted mx-auto mb-2" />
              <p className="text-text-muted text-sm">No tasks found</p>
            </CardContent>
          </Card>
        )}
        {tasks.map((task, i) => {
          const priority = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.medium
          const PriorityIcon = priority.icon
          const isOverdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date()

          return (
            <motion.div key={task.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className={`transition-all ${isOverdue ? 'border-danger/30' : ''}`}>
                <CardContent className="p-4 flex items-center gap-3">
                  <button
                    onClick={() => task.status !== 'done' && completeMutation.mutate(task.id)}
                    className={`h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                      task.status === 'done'
                        ? 'bg-success border-success text-white'
                        : 'border-border hover:border-success'
                    }`}
                  >
                    {task.status === 'done' && <CheckSquare className="h-3 w-3" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                        {task.title}
                      </span>
                      <PriorityIcon className={`h-3.5 w-3.5 shrink-0 ${isOverdue ? 'text-danger' : 'text-text-muted'}`} />
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-text-muted">
                      {task.lead && <span className="text-brand-purple">{task.lead.name}</span>}
                      {task.assignedUser && <span>{task.assignedUser.name}</span>}
                      {task.description && <span className="truncate max-w-48">{task.description}</span>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge variant={priority.color} className="text-[9px]">{task.priority}</Badge>
                    {task.dueDate && (
                      <p className={`text-[10px] mt-1 ${isOverdue ? 'text-danger font-medium' : 'text-text-muted'}`}>
                        Due {formatDate(task.dueDate)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
