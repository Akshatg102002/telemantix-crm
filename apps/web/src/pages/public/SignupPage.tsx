import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Check, ArrowRight, ArrowLeft, Eye, EyeOff, Zap, Copy, CheckCheck } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuthStore } from '../../store/auth'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import { useToast } from '../../components/ui/toast'

interface Plan {
  id: string
  name: string
  slug: string
  price: number
  yearlyPrice: number
  maxUsers: number
  maxLeads: number
  features: string[]
  isPopular: boolean
}

const step1Schema = z.object({
  companyName: z.string().min(2, 'Company name required').max(100),
  industry: z.string().min(1, 'Select an industry'),
  companySize: z.string().min(1, 'Select company size'),
  website: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  phone: z.string().min(7, 'Enter a valid phone number'),
})

const step3Schema = z.object({
  name: z.string().min(2, 'Full name required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string(),
  terms: z.boolean().refine(v => v === true, 'You must accept the terms'),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })

type Step1Data = z.infer<typeof step1Schema>
type Step3Data = z.infer<typeof step3Schema>

function ProgressBar({ step }: { step: number }) {
  const steps = ['Company Details', 'Select Plan', 'Your Account']
  return (
    <div className="flex items-center gap-2 mb-10">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2 flex-1">
          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300 ${i < step ? 'bg-brand-gradient text-white' : i === step ? 'bg-brand-purple/20 border border-brand-purple text-brand-purple' : 'bg-bg-elevated border border-border text-text-muted'
            }`}>
            {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </div>
          <span className={`text-xs hidden sm:block ${i === step ? 'text-text-primary font-medium' : 'text-text-muted'}`}>{label}</span>
          {i < steps.length - 1 && <div className={`h-px flex-1 transition-all duration-500 ${i < step ? 'bg-brand-gradient' : 'bg-border'}`} />}
        </div>
      ))}
    </div>
  )
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /[0-9]/.test(password) },
  ]
  const score = checks.filter(c => c.pass).length
  const colors = ['bg-danger', 'bg-warning', 'bg-success']
  if (!password) return null
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < score ? colors[score - 1] : 'bg-border'}`} />
        ))}
      </div>
      <div className="flex gap-3">
        {checks.map(c => (
          <span key={c.label} className={`text-[10px] ${c.pass ? 'text-success' : 'text-text-muted'}`}>
            {c.pass ? '✓' : '○'} {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Welcome modal shown after successful signup ──────────────────────────────
function WelcomeModal({ slug, onContinue }: { slug: string; onContinue: () => void }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(slug)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-bg-surface border border-border rounded-2xl p-8 max-w-md w-full shadow-2xl"
      >
        {/* Success icon */}
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center">
            <Check className="h-8 w-8 text-success" />
          </div>
        </div>

        <h2 className="font-heading font-bold text-2xl text-text-primary text-center mb-2">
          Account Created! 🎉
        </h2>
        <p className="text-text-secondary text-sm text-center mb-6">
          Your 14-day free trial has started. Save your workspace slug — you'll need it to log in.
        </p>

        {/* Workspace slug box */}
        <div className="bg-bg-elevated border border-brand-purple/30 rounded-xl p-4 mb-6">
          <p className="text-xs text-text-muted mb-1">Your Workspace Slug</p>
          <div className="flex items-center justify-between gap-3">
            <code className="text-brand-purple font-bold text-lg">{slug}</code>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors bg-bg-surface border border-border rounded-lg px-3 py-1.5"
            >
              {copied ? <CheckCheck className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Login instructions */}
        <div className="bg-bg-elevated rounded-xl p-4 mb-6 space-y-2">
          <p className="text-xs font-medium text-text-primary">To log in next time:</p>
          <div className="space-y-1 text-xs text-text-secondary">
            <p>1. Go to <span className="text-brand-purple">/login</span></p>
            <p>2. Enter workspace: <span className="font-mono text-brand-purple">{slug}</span></p>
            <p>3. Enter your email and password</p>
          </div>
        </div>

        <Button className="w-full" onClick={onContinue}>
          Go to Dashboard <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </motion.div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function SignupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setAuth } = useAuthStore()
  const { error: toastError } = useToast()

  const [step, setStep] = useState(0)
  const [yearly, setYearly] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(searchParams.get('plan') || 'growth')
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null)
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [workspaceSlug, setWorkspaceSlug] = useState<string | null>(null)

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ['public-plans'],
    queryFn: () => api.get('/public/plans').then(r => r.data.data),
  })

  const form1 = useForm<Step1Data>({ resolver: zodResolver(step1Schema) })
  const form3 = useForm<Step3Data>({ resolver: zodResolver(step3Schema) })
  const pw = form3.watch('password', '')

  const handleStep1 = (data: Step1Data) => {
    setStep1Data(data)
    setStep(1)
  }

  const handleSubmit = async (data: Step3Data) => {
    if (!step1Data) return
    setSubmitting(true)
    try {
      const res = await api.post('/public/register', {
        ...step1Data,
        planSlug: selectedPlan,
        billingCycle: yearly ? 'yearly' : 'monthly',
        name: data.name,
        email: data.email,
        password: data.password,
      })
      const { user, tenant, accessToken, refreshToken } = res.data.data
      setAuth(user, tenant, accessToken, refreshToken)
      // Show welcome modal with workspace slug
      setWorkspaceSlug(tenant.slug)
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Signup failed. Please try again.'
      toastError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Welcome modal after signup */}
      {workspaceSlug && (
        <WelcomeModal
          slug={workspaceSlug}
          onContinue={() => navigate('/dashboard')}
        />
      )}

      <div className="min-h-screen bg-bg flex">
        {/* Left panel */}
        <div className="hidden lg:flex w-96 shrink-0 flex-col justify-between p-10 border-r border-border"
          style={{ background: 'linear-gradient(135deg, rgba(123,47,190,0.1) 0%, rgba(232,98,42,0.05) 100%)' }}>
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-brand-gradient flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-heading font-bold text-text-primary">Telemantix</span>
          </Link>
          <div>
            <h2 className="font-heading font-bold text-2xl text-text-primary mb-4">Start closing deals faster.</h2>
            <div className="space-y-3">
              {['14-day free trial, no credit card', '500+ leads imported on day 1', 'Setup in under 30 minutes', 'Dedicated onboarding support'].map(f => (
                <div key={f} className="flex items-center gap-3 text-sm text-text-secondary">
                  <div className="h-5 w-5 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-success" />
                  </div>
                  {f}
                </div>
              ))}
            </div>
          </div>
          <p className="text-text-muted text-xs">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-purple hover:underline">Sign in</Link>
          </p>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-lg">
            <div className="mb-6 lg:hidden">
              <Link to="/" className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-brand-gradient flex items-center justify-center">
                  <Zap className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="font-heading font-bold text-text-primary">Telemantix</span>
              </Link>
            </div>

            <ProgressBar step={step} />

            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 className="font-heading font-bold text-2xl text-text-primary mb-1">Company Details</h2>
                  <p className="text-text-secondary text-sm mb-6">Tell us about your business</p>
                  <form onSubmit={form1.handleSubmit(handleStep1)} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Company Name *</Label>
                      <Input placeholder="Acme Corp" error={form1.formState.errors.companyName?.message} {...form1.register('companyName')} />
                      <p className="text-xs text-text-muted">Your workspace slug will be generated from this (e.g. "acme-corp")</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Industry *</Label>
                        <Select error={form1.formState.errors.industry?.message} {...form1.register('industry')}>
                          <option value="">Select industry</option>
                          {['Real Estate', 'Education', 'Finance', 'Healthcare', 'E-commerce', 'Technology', 'Other'].map(i => (
                            <option key={i} value={i}>{i}</option>
                          ))}
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Company Size *</Label>
                        <Select error={form1.formState.errors.companySize?.message} {...form1.register('companySize')}>
                          <option value="">Select size</option>
                          {['1-10', '11-50', '51-200', '200+'].map(s => (
                            <option key={s} value={s}>{s} employees</option>
                          ))}
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone *</Label>
                      <Input placeholder="+91 98765 43210" error={form1.formState.errors.phone?.message} {...form1.register('phone')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Website</Label>
                      <Input placeholder="https://yourcompany.com" error={form1.formState.errors.website?.message} {...form1.register('website')} />
                    </div>
                    <Button type="submit" className="w-full mt-2">
                      Continue <ArrowRight className="h-4 w-4" />
                    </Button>
                  </form>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 className="font-heading font-bold text-2xl text-text-primary mb-1">Choose Your Plan</h2>
                  <p className="text-text-secondary text-sm mb-5">All plans include a 14-day free trial</p>
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <span className={`text-sm ${!yearly ? 'text-text-primary' : 'text-text-muted'}`}>Monthly</span>
                    <button
                      onClick={() => setYearly(!yearly)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${yearly ? 'bg-brand-purple' : 'bg-border'}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${yearly ? 'left-5' : 'left-0.5'}`} />
                    </button>
                    <span className={`text-sm ${yearly ? 'text-text-primary' : 'text-text-muted'}`}>
                      Yearly <span className="text-success text-xs">Save 17%</span>
                    </span>
                  </div>
                  <div className="space-y-3">
                    {plans.map(plan => (
                      <button
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.slug)}
                        className={`w-full p-4 rounded-xl border text-left transition-all ${selectedPlan === plan.slug
                            ? 'border-brand-purple/60 bg-brand-purple/10 shadow-glow-purple'
                            : 'border-border hover:border-brand-purple/30'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-heading font-semibold text-text-primary">{plan.name}</span>
                              {plan.isPopular && (
                                <span className="text-[10px] bg-brand-gradient text-white px-2 py-0.5 rounded-full">Popular</span>
                              )}
                            </div>
                            <p className="text-xs text-text-muted mt-0.5">
                              {plan.maxUsers === -1 ? 'Unlimited' : `Up to ${plan.maxUsers}`} users ·{' '}
                              {plan.maxLeads === -1 ? 'Unlimited' : plan.maxLeads.toLocaleString('en-IN')} leads
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-heading font-bold text-xl text-text-primary">
                              ₹{(yearly ? Math.round(plan.yearlyPrice / 12) : plan.price).toLocaleString('en-IN')}
                            </span>
                            <span className="text-text-muted text-xs">/user/mo</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3 mt-6">
                    <Button variant="secondary" onClick={() => setStep(0)}>
                      <ArrowLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button className="flex-1" onClick={() => setStep(2)}>
                      Continue <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 className="font-heading font-bold text-2xl text-text-primary mb-1">Create Your Account</h2>
                  <p className="text-text-secondary text-sm mb-6">You'll be the admin of your organization</p>
                  <form onSubmit={form3.handleSubmit(handleSubmit)} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Full Name *</Label>
                      <Input placeholder="Rahul Sharma" error={form3.formState.errors.name?.message} {...form3.register('name')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Work Email *</Label>
                      <Input type="email" placeholder="you@company.com" error={form3.formState.errors.email?.message} {...form3.register('email')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Password *</Label>
                      <div className="relative">
                        <Input
                          type={showPw ? 'text' : 'password'}
                          placeholder="Min 8 characters"
                          error={form3.formState.errors.password?.message}
                          {...form3.register('password')}
                        />
                        <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <PasswordStrength password={pw} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Confirm Password *</Label>
                      <div className="relative">
                        <Input
                          type={showConfirmPw ? 'text' : 'password'}
                          placeholder="Repeat password"
                          error={form3.formState.errors.confirmPassword?.message}
                          {...form3.register('confirmPassword')}
                        />
                        <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                          {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <label className="flex items-start gap-2.5 text-xs text-text-secondary cursor-pointer">
                      <input type="checkbox" {...form3.register('terms')} className="mt-0.5 accent-brand-purple" />
                      <span>
                        I agree to the{' '}
                        <a href="#" className="text-brand-purple hover:underline">Terms of Service</a> and{' '}
                        <a href="#" className="text-brand-purple hover:underline">Privacy Policy</a>
                      </span>
                    </label>
                    {form3.formState.errors.terms && (
                      <p className="text-xs text-danger">{form3.formState.errors.terms.message}</p>
                    )}
                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                        <ArrowLeft className="h-4 w-4" /> Back
                      </Button>
                      <Button type="submit" className="flex-1" loading={submitting}>
                        Create Account
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  )
}