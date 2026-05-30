import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, Eye, EyeOff } from 'lucide-react'
import { superAdminApi } from '../../lib/superAdminApi'
import { useSuperAdminStore } from '../../store/superAdmin'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useToast } from '../../components/ui/toast'

export function SuperAdminLogin() {
  const navigate = useNavigate()
  const { setAuth } = useSuperAdminStore()
  const { error: toastError } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await superAdminApi.post('/super-admin/login', { email, password })
      const { token, admin } = res.data.data
      setAuth(admin, token)
      navigate('/super-admin/dashboard')
    } catch {
      toastError('Invalid super admin credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(123,47,190,0.12),transparent)]" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-sm mx-4">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-danger/10 border border-danger/30 flex items-center justify-center mb-4">
            <Shield className="h-7 w-7 text-danger" />
          </div>
          <h1 className="font-heading font-bold text-xl text-text-primary">Super Admin</h1>
          <p className="text-text-secondary text-sm mt-1">Restricted access — Telemantix staff only</p>
        </div>
        <div className="bg-bg-surface rounded-2xl border border-border p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="superadmin@telemantix.io" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <div className="relative">
                <Input type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full bg-danger/80 hover:bg-danger border-0" loading={loading}>
              Sign In to Super Admin
            </Button>
          </form>
        </div>
        <p className="text-center text-xs text-text-muted mt-4">
          <a href="/" className="text-text-secondary hover:text-text-primary">← Back to Telemantix</a>
        </p>
      </motion.div>
    </div>
  )
}
