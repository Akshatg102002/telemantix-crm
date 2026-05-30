import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import { superAdminApi } from '../../lib/superAdminApi'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useToast } from '../../components/ui/toast'

export function SuperAdminSettings() {
  const { success, error: toastError } = useToast()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  const changePwMut = useMutation({
    mutationFn: () => superAdminApi.put('/super-admin/settings/password', { currentPassword: currentPw, newPassword: newPw }),
    onSuccess: () => { success('Password changed successfully'); setCurrentPw(''); setNewPw(''); setConfirmPw('') },
    onError: () => toastError('Failed to change password'),
  })

  const handleChangePw = () => {
    if (newPw !== confirmPw) { toastError('Passwords do not match'); return }
    if (newPw.length < 8) { toastError('Password must be at least 8 characters'); return }
    changePwMut.mutate()
  }

  return (
    <div className="p-6 space-y-5 max-w-xl">
      <div>
        <h1 className="font-heading font-bold text-xl text-text-primary">Super Admin Settings</h1>
        <p className="text-text-secondary text-xs mt-0.5">Platform-level configuration</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card gradient>
          <CardHeader className="flex-row items-center gap-2">
            <Lock className="h-4 w-4 text-danger" />
            <CardTitle className="text-sm">Change Password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Current Password</Label>
              <Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 8 characters" />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm New Password</Label>
              <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat new password" />
            </div>
            <Button size="sm" onClick={handleChangePw} loading={changePwMut.isPending} disabled={!currentPw || !newPw || !confirmPw}>
              Update Password
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
