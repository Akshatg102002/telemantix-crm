import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Zap, Target, MessageSquare, Phone, BarChart3, Bot, Globe, Layers, Calendar,
  Play, Check, Star, ArrowRight, ChevronDown, Menu, X
} from 'lucide-react'
import { api } from '../../lib/api'

// ─── Types ──────────────────────────────────────────────────────────────────

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

// ─── Animation helpers ───────────────────────────────────────────────────────

const fadeUp = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } }
const stagger = (delay = 0.1) => ({ show: { transition: { staggerChildren: delay } } })

function RevealSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div ref={ref} variants={fadeUp} initial="hidden" animate={inView ? 'show' : 'hidden'} className={className}>
      {children}
    </motion.div>
  )
}

// ─── Navbar ──────────────────────────────────────────────────────────────────

function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  if (typeof window !== 'undefined') {
    window.onscroll = () => setScrolled(window.scrollY > 20)
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'glass border-b border-border/50' : ''}`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-brand-gradient flex items-center justify-center">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-heading font-bold text-text-primary text-lg">Telemantix</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm">
          {['Features', 'Pricing', 'Integrations'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} className="text-text-secondary hover:text-text-primary transition-colors">
              {item}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-sm text-text-secondary hover:text-text-primary transition-colors px-3 py-1.5">
            Sign In
          </Link>
          <Link
            to="/signup"
            className="text-sm font-medium bg-brand-gradient text-white px-4 py-2 rounded-full hover:shadow-glow-purple hover:scale-[1.02] transition-all"
          >
            Start Free Trial
          </Link>
        </div>

        <button className="md:hidden text-text-secondary" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="md:hidden glass border-b border-border p-4 space-y-3">
          {['Features', 'Pricing', 'Integrations'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} className="block text-sm text-text-secondary hover:text-text-primary py-1">
              {item}
            </a>
          ))}
          <Link to="/signup" className="block text-center bg-brand-gradient text-white text-sm font-medium py-2 rounded-full">
            Start Free Trial
          </Link>
        </motion.div>
      )}
    </nav>
  )
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  const navigate = useNavigate()
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 overflow-hidden">
      {/* Dot grid background */}
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: 'radial-gradient(circle, #2A2A2F 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />
      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-brand-purple/10 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-brand-coral/8 blur-3xl" />

      <div className="relative max-w-5xl mx-auto px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="inline-flex items-center gap-2 text-xs font-medium bg-brand-purple/15 border border-brand-purple/30 text-brand-purple px-3 py-1.5 rounded-full mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-purple animate-pulse-slow" />
            Now in Beta — Join 500+ Companies
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-heading font-bold text-5xl md:text-7xl text-text-primary leading-tight mb-6"
        >
          The CRM Built for{' '}
          <span className="gradient-text">Modern Sales Teams</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-text-secondary text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Capture leads from 10+ sources, automate follow-ups, and close deals faster — all in one place.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            to="/signup"
            className="flex items-center gap-2 bg-brand-gradient text-white font-medium px-7 py-3.5 rounded-full text-sm hover:shadow-glow-purple hover:scale-[1.03] transition-all"
          >
            Start Free Trial <ArrowRight className="h-4 w-4" />
          </Link>
          <button className="flex items-center gap-2 border border-border text-text-secondary hover:text-text-primary hover:border-border px-7 py-3.5 rounded-full text-sm transition-all hover:bg-bg-elevated">
            <Play className="h-4 w-4" /> Watch Demo
          </button>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-8 mt-14 text-sm"
        >
          {[
            { label: 'Companies', value: '500+' },
            { label: 'Leads Managed', value: '2M+' },
            { label: 'Customer Satisfaction', value: '98%' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="font-heading font-bold text-xl gradient-text">{s.value}</span>
              <span className="text-text-muted">{s.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 relative"
        >
          <div className="rounded-2xl border border-border bg-bg-surface shadow-2xl overflow-hidden" style={{ boxShadow: '0 0 80px rgba(123,47,190,0.15), 0 40px 80px rgba(0,0,0,0.5)' }}>
            {/* Fake browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-bg-elevated border-b border-border">
              <div className="h-3 w-3 rounded-full bg-danger/60" />
              <div className="h-3 w-3 rounded-full bg-warning/60" />
              <div className="h-3 w-3 rounded-full bg-success/60" />
              <div className="flex-1 mx-4 bg-bg-surface rounded-md h-5 flex items-center px-2">
                <span className="text-text-muted text-[10px]">app.telemantix.io/dashboard</span>
              </div>
            </div>
            {/* Dashboard preview */}
            <div className="p-5 bg-bg grid grid-cols-4 gap-3">
              {[
                { label: 'Total Leads', value: '2,847', color: 'bg-brand-purple/20' },
                { label: 'Converted', value: '127', color: 'bg-success/20' },
                { label: 'Follow-ups Due', value: '43', color: 'bg-warning/20' },
                { label: 'Pipeline', value: '₹48L', color: 'bg-brand-coral/20' },
              ].map(k => (
                <div key={k.label} className={`${k.color} rounded-xl p-3 border border-white/5`}>
                  <p className="text-text-muted text-[10px]">{k.label}</p>
                  <p className="font-heading font-bold text-text-primary text-lg mt-1">{k.value}</p>
                </div>
              ))}
              {/* Fake chart bar */}
              <div className="col-span-3 bg-bg-surface rounded-xl p-3 border border-border h-28 flex items-end gap-1.5">
                {[60, 80, 45, 90, 70, 85, 95, 65, 75, 88, 72, 92].map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm bg-brand-gradient opacity-70" style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="bg-bg-surface rounded-xl p-3 border border-border h-28 flex flex-col justify-between">
                <p className="text-[10px] text-text-muted">Lead Score</p>
                <div className="space-y-1">
                  {[{ l: 'Hot', w: '70%', c: 'bg-success' }, { l: 'Warm', w: '50%', c: 'bg-warning' }, { l: 'Cold', w: '30%', c: 'bg-danger' }].map(s => (
                    <div key={s.l} className="flex items-center gap-1.5">
                      <div className={`h-1.5 ${s.c} rounded-full`} style={{ width: s.w }} />
                      <span className="text-[9px] text-text-muted">{s.l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Glow under mockup */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 h-20 w-3/4 bg-brand-purple/20 blur-3xl rounded-full" />
        </motion.div>
      </div>
    </section>
  )
}

// ─── Features ────────────────────────────────────────────────────────────────

const features = [
  { icon: Target, title: 'Lead Management', desc: 'Auto-assign, score, and track 100k+ leads with full audit history and re-enquiry detection.' },
  { icon: MessageSquare, title: 'WhatsApp Integration', desc: 'Send template messages, receive replies, and log conversations directly from any lead.' },
  { icon: Phone, title: 'IVR & Dialer', desc: 'Click-to-call via Exotel, log inbound calls, and build simple IVR menus.' },
  { icon: Bot, title: 'Automation Engine', desc: 'Visual trigger→condition→action builder. Auto follow-ups, status changes, webhooks.' },
  { icon: Globe, title: 'Meta & Google Ads', desc: 'Auto-capture leads from Facebook, Instagram, and Google Lead Form Extensions.' },
  { icon: BarChart3, title: 'Advanced Analytics', desc: 'Lead funnel, conversion trends, agent performance tables, and revenue pipeline charts.' },
  { icon: Layers, title: '7+ Marketplace Sources', desc: 'IndiaMART, JustDial, 99acres, Housing.com, TradeIndia — all auto-synced.' },
  { icon: Zap, title: 'Service Boards', desc: 'Custom status pipelines per business vertical. Drag-and-drop reorder. Substatus support.' },
  { icon: Calendar, title: 'Follow-up System', desc: 'Schedule calls, WhatsApp, email or meetings. BullMQ-powered reminders 15 min before.' },
]

function Features() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <section id="features" className="py-24 max-w-7xl mx-auto px-6">
      <RevealSection className="text-center mb-16">
        <h2 className="font-heading font-bold text-4xl md:text-5xl text-text-primary mb-4">
          Everything your sales team <span className="gradient-text">needs</span>
        </h2>
        <p className="text-text-secondary text-lg max-w-2xl mx-auto">
          From lead capture to conversion — built for Indian sales teams managing high volumes.
        </p>
      </RevealSection>

      <motion.div
        ref={ref}
        variants={stagger(0.07)}
        initial="hidden"
        animate={inView ? 'show' : 'hidden'}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {features.map(f => (
          <motion.div key={f.title} variants={fadeUp}>
            <div className="h-full p-6 rounded-2xl border border-white/8 hover:border-brand-purple/30 transition-all duration-300 group hover:shadow-card-hover"
              style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(8px)' }}>
              <div className="h-10 w-10 rounded-xl bg-brand-gradient flex items-center justify-center mb-4 group-hover:shadow-glow-purple transition-shadow">
                <f.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-heading font-semibold text-text-primary mb-2">{f.title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{f.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}

// ─── Integrations ─────────────────────────────────────────────────────────────

const integrations = [
  { name: 'Meta', color: '#1877F2' }, { name: 'WhatsApp', color: '#25D366' },
  { name: 'Google Ads', color: '#4285F4' }, { name: 'IndiaMART', color: '#E87722' },
  { name: 'JustDial', color: '#FF6B35' }, { name: '99acres', color: '#E63946' },
  { name: 'Housing.com', color: '#00B894' }, { name: 'TradeIndia', color: '#FF9800' },
  { name: 'Exotel', color: '#8B5CF6' }, { name: 'SendGrid', color: '#1A82E2' },
]

function Integrations() {
  return (
    <section id="integrations" className="py-24 overflow-hidden">
      <RevealSection className="text-center mb-16 px-6">
        <h2 className="font-heading font-bold text-4xl md:text-5xl text-text-primary mb-4">
          Connect your entire <span className="gradient-text">lead ecosystem</span>
        </h2>
        <p className="text-text-secondary text-lg max-w-2xl mx-auto">
          10+ integrations ready on day one. No code required.
        </p>
      </RevealSection>

      {/* Marquee rows */}
      <div className="space-y-4">
        {[integrations, [...integrations].reverse()].map((row, dir) => (
          <div key={dir} className="flex gap-4 overflow-hidden">
            <motion.div
              animate={{ x: dir === 0 ? [0, -50 * row.length] : [-50 * row.length, 0] }}
              transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              className="flex gap-4 shrink-0"
            >
              {[...row, ...row].map((intg, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 px-5 py-3 rounded-xl border border-white/8 shrink-0 whitespace-nowrap"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <div className="h-6 w-6 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: intg.color }}>
                    {intg.name[0]}
                  </div>
                  <span className="text-sm text-text-secondary font-medium">{intg.name}</span>
                </div>
              ))}
            </motion.div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    { icon: Target, title: 'Capture', desc: 'Pull leads automatically from ads, marketplaces, and webhooks. Zero manual entry.', color: 'text-brand-purple' },
    { icon: MessageSquare, title: 'Engage', desc: 'Auto-assign to agents, trigger WhatsApp messages, schedule follow-ups — all automated.', color: 'text-brand-magenta' },
    { icon: BarChart3, title: 'Convert', desc: 'Track every touchpoint, score leads, close deals, and see your full revenue pipeline.', color: 'text-brand-coral' },
  ]
  return (
    <section className="py-24 max-w-5xl mx-auto px-6">
      <RevealSection className="text-center mb-16">
        <h2 className="font-heading font-bold text-4xl md:text-5xl text-text-primary mb-4">
          How it <span className="gradient-text">works</span>
        </h2>
      </RevealSection>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
        <div className="absolute top-10 left-1/6 right-1/6 h-px bg-gradient-to-r from-brand-purple via-brand-magenta to-brand-coral hidden md:block opacity-30" />
        {steps.map((step, i) => (
          <RevealSection key={step.title}>
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="h-16 w-16 rounded-2xl border border-white/10 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <step.icon className={`h-7 w-7 ${step.color}`} />
                </div>
                <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-brand-gradient text-white text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <h3 className="font-heading font-semibold text-xl text-text-primary mb-2">{step.title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{step.desc}</p>
            </div>
          </RevealSection>
        ))}
      </div>
    </section>
  )
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

function Pricing() {
  const [yearly, setYearly] = useState(false)
  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ['public-plans'],
    queryFn: () => api.get('/public/plans').then(r => r.data.data),
  })

  return (
    <section id="pricing" className="py-24 max-w-7xl mx-auto px-6">
      <RevealSection className="text-center mb-12">
        <h2 className="font-heading font-bold text-4xl md:text-5xl text-text-primary mb-4">
          Simple, transparent <span className="gradient-text">pricing</span>
        </h2>
        <p className="text-text-secondary text-lg mb-8">Start free for 14 days. No credit card required.</p>
        <div className="inline-flex items-center gap-2 bg-bg-surface border border-border rounded-full p-1">
          <button onClick={() => setYearly(false)} className={`px-4 py-1.5 rounded-full text-sm transition-all ${!yearly ? 'bg-brand-gradient text-white' : 'text-text-secondary'}`}>Monthly</button>
          <button onClick={() => setYearly(true)} className={`px-4 py-1.5 rounded-full text-sm transition-all ${yearly ? 'bg-brand-gradient text-white' : 'text-text-secondary'}`}>
            Yearly <span className="text-success text-xs ml-1">Save 17%</span>
          </button>
        </div>
      </RevealSection>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, i) => (
          <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}>
            <div className={`h-full p-6 rounded-2xl border transition-all duration-300 relative flex flex-col ${plan.isPopular
              ? 'border-brand-purple/60 gradient-border shadow-glow-purple'
              : 'border-white/8 hover:border-brand-purple/30'}`}
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-gradient text-white text-xs font-semibold px-4 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              <div className="mb-6">
                <h3 className="font-heading font-bold text-xl text-text-primary">{plan.name}</h3>
                <div className="mt-3 flex items-end gap-1">
                  <span className="font-heading font-bold text-4xl text-text-primary">
                    ₹{(yearly ? Math.round(plan.yearlyPrice / 12) : plan.price).toLocaleString('en-IN')}
                  </span>
                  <span className="text-text-muted text-sm mb-1">/user/mo</span>
                </div>
                {yearly && <p className="text-success text-xs mt-1">₹{plan.yearlyPrice.toLocaleString('en-IN')}/year billed annually</p>}
              </div>

              <div className="space-y-1.5 text-xs text-text-secondary mb-6">
                <p>👥 {plan.maxUsers === -1 ? 'Unlimited' : `Up to ${plan.maxUsers}`} users</p>
                <p>🎯 {plan.maxLeads === -1 ? 'Unlimited' : plan.maxLeads.toLocaleString('en-IN')} leads</p>
              </div>

              <ul className="space-y-2.5 flex-1">
                {(plan.features as string[]).map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    <span className="text-text-secondary">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={`/signup?plan=${plan.slug}`}
                className={`mt-6 block text-center py-2.5 rounded-xl text-sm font-medium transition-all ${
                  plan.isPopular
                    ? 'bg-brand-gradient text-white hover:shadow-glow-purple hover:scale-[1.02]'
                    : 'border border-border text-text-secondary hover:border-brand-purple/50 hover:text-text-primary'
                }`}
              >
                Start Free Trial
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

const testimonials = [
  { name: 'Arjun Mehta', role: 'Sales Director', company: 'PropDeals Realty', text: 'Telemantix cut our follow-up time by 60%. We went from managing leads in spreadsheets to a full pipeline in one week. The WhatsApp automation alone is worth it.', rating: 5 },
  { name: 'Priya Sharma', role: 'Founder', company: 'EduConnect', text: 'The IndiaMART integration was a game changer. Leads flow in automatically and agents get assigned instantly. Our conversion rate went up by 35% in 2 months.', rating: 5 },
  { name: 'Ravi Gupta', role: 'Head of Operations', company: 'FinServ Solutions', text: 'We evaluated 5 CRMs before Telemantix. Nothing else handled IVR + WhatsApp + Meta Ads in one product. Setup took a day, not weeks.', rating: 5 },
]

function Testimonials() {
  return (
    <section className="py-24 max-w-7xl mx-auto px-6">
      <RevealSection className="text-center mb-14">
        <h2 className="font-heading font-bold text-4xl md:text-5xl text-text-primary mb-4">
          Loved by <span className="gradient-text">sales teams</span>
        </h2>
      </RevealSection>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((t, i) => (
          <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}>
            <div className="h-full p-6 rounded-2xl border border-white/8 flex flex-col gap-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="h-4 w-4 text-warning fill-warning" />)}
              </div>
              <p className="text-text-secondary text-sm leading-relaxed flex-1">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-brand-gradient flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{t.name}</p>
                  <p className="text-xs text-text-muted">{t.role}, {t.company}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

// ─── CTA Banner ───────────────────────────────────────────────────────────────

function CtaBanner() {
  return (
    <section className="py-20 max-w-4xl mx-auto px-6 text-center">
      <RevealSection>
        <div className="rounded-2xl p-10 relative overflow-hidden border border-brand-purple/30" style={{ background: 'linear-gradient(135deg, rgba(123,47,190,0.15) 0%, rgba(232,98,42,0.08) 100%)' }}>
          <div className="absolute inset-0 bg-brand-gradient opacity-5" />
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-text-primary mb-4 relative">
            Ready to transform your sales process?
          </h2>
          <p className="text-text-secondary mb-8 relative">Start your 14-day free trial. No credit card required.</p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 bg-brand-gradient text-white font-semibold px-8 py-3.5 rounded-full text-sm hover:shadow-glow-purple hover:scale-[1.03] transition-all relative"
          >
            Start Free Trial <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </RevealSection>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-lg bg-brand-gradient flex items-center justify-center"><Zap className="h-3.5 w-3.5 text-white" /></div>
              <span className="font-heading font-bold text-text-primary">Telemantix</span>
            </div>
            <p className="text-text-muted text-xs leading-relaxed">The CRM for modern Indian sales teams. Built for speed, scale, and automation.</p>
          </div>
          {[
            { heading: 'Product', links: ['Features', 'Pricing', 'Integrations', 'Changelog'] },
            { heading: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
            { heading: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'] },
          ].map(col => (
            <div key={col.heading}>
              <h4 className="font-heading font-semibold text-xs text-text-muted uppercase tracking-wider mb-3">{col.heading}</h4>
              <ul className="space-y-2">
                {col.links.map(l => <li key={l}><a href="#" className="text-text-secondary text-sm hover:text-text-primary transition-colors">{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border pt-6 text-xs text-text-muted">
          <span>© 2025 Telemantix. All rights reserved.</span>
          <Link to="/super-admin/login" className="hover:text-text-secondary transition-colors">Admin</Link>
        </div>
      </div>
    </footer>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <Hero />
      <Features />
      <Integrations />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <CtaBanner />
      <Footer />
    </div>
  )
}
