import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Zap } from 'lucide-react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useToast } from '../components/ui/toast'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { error: toastError } = useToast()
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await api.post('/auth/login', data)
      const { user, tenant, accessToken, refreshToken } = res.data.data
      setAuth(user, tenant, accessToken, refreshToken)
      navigate('/')
    } catch {
      toastError('Invalid credentials', 'Please check your email and password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(123,47,190,0.15),transparent)]" />
      <div className="absolute top-1/3 left-1/4 h-72 w-72 rounded-full bg-brand-purple/5 blur-3xl" />
      <div className="absolute bottom-1/3 right-1/4 h-72 w-72 rounded-full bg-brand-coral/5 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-sm mx-4"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="h-14 w-14 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-glow-purple mb-4"
          >
            <Zap className="h-7 w-7 text-white" />
          </motion.div>
          <h1 className="font-heading font-bold text-2xl text-text-primary">Telemantix</h1>
          <p className="text-text-secondary text-sm mt-1">CRM for modern sales teams</p>
        </div>

        {/* Card */}
        <div className="bg-bg-surface rounded-2xl border border-border p-6 gradient-border shadow-2xl">
          <h2 className="font-heading font-semibold text-text-primary text-lg mb-5">Welcome back</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  error={errors.password?.message}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full mt-2" loading={loading}>
              Sign In
            </Button>
          </form>
          <p className="text-center text-xs text-text-muted mt-4">
            Demo: <span className="text-text-secondary">admin@demo.com / admin123</span>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
