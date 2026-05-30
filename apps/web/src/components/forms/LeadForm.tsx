import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select } from '../ui/select'
import { Textarea } from '../ui/textarea'
import { useCreateLead, useServiceBoards, useUsers } from '../../hooks/useApi'
import { useToast } from '../ui/toast'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(7, 'Valid phone required'),
  email: z.string().email().optional().or(z.literal('')),
  sourceId: z.string().optional(),
  serviceBoardId: z.string().optional(),
  assignedUserId: z.string().optional(),
  dealValue: z.number().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function LeadForm({ onSuccess }: { onSuccess?: () => void }) {
  const { success, error: toastError } = useToast()
  const { data: boards } = useServiceBoards()
  const { data: users } = useUsers()
  const createLead = useCreateLead()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      await createLead.mutateAsync({ ...data, email: data.email || undefined })
      success('Lead created successfully')
      onSuccess?.()
    } catch {
      toastError('Failed to create lead')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Full Name *</Label>
          <Input placeholder="John Doe" error={errors.name?.message} {...register('name')} />
        </div>
        <div className="space-y-1.5">
          <Label>Phone *</Label>
          <Input placeholder="+91 9876543210" error={errors.phone?.message} {...register('phone')} />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" placeholder="john@example.com" error={errors.email?.message} {...register('email')} />
        </div>
        <div className="space-y-1.5">
          <Label>Deal Value</Label>
          <Input type="number" placeholder="500000" {...register('dealValue', { valueAsNumber: true })} />
        </div>
        <div className="space-y-1.5">
          <Label>Service Board</Label>
          <Select {...register('serviceBoardId')}>
            <option value="">Select board</option>
            {(boards || []).map((b: { id: string; name: string }) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Assign To</Label>
          <Select {...register('assignedUserId')}>
            <option value="">Unassigned</option>
            {(users || []).map((u: { id: string; name: string }) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea placeholder="Any additional notes..." rows={3} {...register('notes')} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" loading={isSubmitting}>Create Lead</Button>
      </div>
    </form>
  )
}
