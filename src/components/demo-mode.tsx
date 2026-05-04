'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MapPin,
  Building2,
  Target,
  Shield,
  Zap,
  Users as UsersIcon,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
import { DEMO_ACCOUNTS, type DemoAccount } from '@/lib/demo-accounts'

const TERRITORY_LABEL = 'AZ · NM · UT · CO Commercial'

function linkedinSearch(q: string) {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(q)}`
}

function StateChip({ state }: { state: DemoAccount['state'] }) {
  const tone: Record<DemoAccount['state'], string> = {
    AZ: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    NM: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    UT: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    CO: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border ${tone[state]}`}>
      {state}
    </span>
  )
}

export default function DemoMode() {
  const [expanded, setExpanded] = useState<string | null>(DEMO_ACCOUNTS[0]?.id ?? null)

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl border border-qumulo-orange/30 bg-gradient-to-br from-qumulo-navy to-qumulo-navy-2 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-widest text-qumulo-orange font-bold">CEO Demo Mode</span>
              <span className="text-[10px] text-slate-400">{TERRITORY_LABEL}</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">
              Five accounts I&apos;d open with on day one.
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl">
              Public-record signals, the likely incumbent at refresh, named decision makers, and the displacement story I&apos;d open with. Every account is in territory and in the $500M-$2B commercial band, with flex up where the program-of-record dynamic justifies it.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mt-6">
          <Stat label="Accounts" value={String(DEMO_ACCOUNTS.length)} Icon={Building2} />
          <Stat label="States" value={String(new Set(DEMO_ACCOUNTS.map(a => a.state)).size)} Icon={MapPin} />
          <Stat label="Verticals" value={String(new Set(DEMO_ACCOUNTS.map(a => a.vertical.split(' ')[0])).size)} Icon={Target} />
          <Stat label="Pipeline (low end)" value={pipelineLow(DEMO_ACCOUNTS)} Icon={Zap} accent />
        </div>
      </div>

      {/* Accounts */}
      <div className="space-y-3">
        {DEMO_ACCOUNTS.map(a => {
          const open = expanded === a.id
          return (
            <div key={a.id} className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden hover:border-white/20 transition-all">
              <button
                onClick={() => setExpanded(open ? null : a.id)}
                className="w-full px-5 py-4 flex items-center gap-4 text-left"
              >
                <span className="w-9 h-9 rounded-lg bg-qumulo-orange/10 border border-qumulo-orange/30 flex items-center justify-center text-sm font-bold text-qumulo-orange flex-shrink-0">
                  {a.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white">{a.company}</span>
                    <StateChip state={a.state} />
                    <span className="text-xs text-slate-400">{a.city}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-slate-300 border border-white/10">{a.vertical}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {a.revenue_band} &middot; {a.employees} &middot; Likely incumbent: <span className="text-slate-200">{a.likely_incumbent}</span>
                  </p>
                </div>
                <span className="text-sm text-qumulo-orange font-mono whitespace-nowrap">{a.est_acv.split(',')[0]}</span>
                {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {open && (
                <div className="border-t border-white/10 p-5 space-y-5">

                  {/* Storage landscape */}
                  <Section icon={Building2} title="Storage Landscape">
                    <div className="grid grid-cols-2 gap-3">
                      <Card label="Workload" body={a.workload_signature} tone="navy" />
                      <Card label="Data Scale" body={a.data_scale} tone="navy" />
                      <Card label="Cloud Posture" body={a.cloud_posture} tone="navy" />
                      <Card label="Budget Cycle" body={a.budget_cycle} tone="navy" />
                    </div>
                  </Section>

                  {/* Pain + advantage */}
                  <Section icon={Target} title="Displacement Opportunity">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/15">
                        <div className="text-[10px] uppercase tracking-wider text-red-300 mb-2 font-bold">Pain at the Incumbent</div>
                        <ul className="space-y-1.5">
                          {a.pain_points.map((p, i) => (
                            <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                              <span className="text-red-400 mt-0.5">&middot;</span> {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-4 rounded-lg bg-qumulo-orange/5 border border-qumulo-orange/20">
                        <div className="text-[10px] uppercase tracking-wider text-qumulo-orange mb-2 font-bold">Qumulo Advantage</div>
                        <p className="text-sm text-slate-200 leading-relaxed">{a.qumulo_advantage}</p>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15 mt-3">
                      <div className="text-[10px] uppercase tracking-wider text-emerald-300 mb-1 font-bold">Proof Points</div>
                      <p className="text-sm text-slate-300">{a.proof_points}</p>
                    </div>
                  </Section>

                  {/* Stakeholders */}
                  <Section icon={UsersIcon} title="Decision-Maker Map">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {a.stakeholders.map((s, i) => (
                        <a
                          key={i}
                          href={linkedinSearch(s.search)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-3 rounded-lg bg-white/[0.04] border border-white/10 hover:border-qumulo-orange/40 transition-all group"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div>
                              <div className="text-sm font-medium text-white">{s.title}</div>
                              <div className="text-[10px] uppercase tracking-wider text-qumulo-orange/80 mt-0.5">{s.role}</div>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-qumulo-orange flex-shrink-0 mt-0.5" />
                          </div>
                          <p className="text-xs text-slate-400">{s.why}</p>
                        </a>
                      ))}
                    </div>
                  </Section>

                  {/* Approach */}
                  <Section icon={Sparkles} title="Approach Strategy">
                    <div className="p-4 rounded-lg bg-qumulo-navy-2/40 border border-qumulo-orange/20">
                      <div className="text-[10px] uppercase tracking-wider text-qumulo-orange mb-2 font-bold">Open With</div>
                      <p className="text-sm text-slate-200 leading-relaxed italic">&quot;{a.open_with}&quot;</p>
                    </div>
                    <div className="mt-3">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-2 font-bold">Discovery Questions</div>
                      <ol className="space-y-1.5">
                        {a.discovery_questions.map((q, i) => (
                          <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                            <span className="text-qumulo-orange font-mono text-xs mt-0.5">{i + 1}.</span>
                            {q}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </Section>

                  {/* Competitive risk */}
                  <Section icon={AlertTriangle} title="Competitive Risk">
                    <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
                      <p className="text-sm text-slate-300">{a.competitive_risk}</p>
                    </div>
                  </Section>

                  {/* ACV */}
                  <Section icon={Shield} title="Estimated ACV">
                    <p className="text-sm text-slate-200">{a.est_acv}</p>
                  </Section>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Building2
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-qumulo-orange" />
        <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-300">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Card({ label, body, tone = 'navy' }: { label: string; body: string; tone?: 'navy' | 'orange' }) {
  const cls = tone === 'orange'
    ? 'bg-qumulo-orange/5 border-qumulo-orange/20'
    : 'bg-white/[0.04] border-white/10'
  return (
    <div className={`p-3 rounded-lg border ${cls}`}>
      <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-bold">{label}</div>
      <p className="text-xs text-slate-200 leading-relaxed">{body}</p>
    </div>
  )
}

function Stat({
  label,
  value,
  Icon,
  accent,
}: {
  label: string
  value: string
  Icon: typeof Building2
  accent?: boolean
}) {
  return (
    <div className={`p-3 rounded-lg border ${accent ? 'bg-qumulo-orange/10 border-qumulo-orange/30' : 'bg-white/5 border-white/10'}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-3.5 h-3.5 ${accent ? 'text-qumulo-orange' : 'text-slate-400'}`} />
        <span className="text-[10px] uppercase tracking-wider text-slate-400">{label}</span>
      </div>
      <div className={`text-xl font-bold ${accent ? 'text-qumulo-orange' : 'text-white'}`}>{value}</div>
    </div>
  )
}

function pipelineLow(accts: DemoAccount[]): string {
  const total = accts.reduce((sum, a) => {
    const m = a.est_acv.match(/\$([0-9.]+)\s*([KMB])/i)
    if (!m) return sum
    const n = parseFloat(m[1])
    const mult = m[2].toUpperCase() === 'M' ? 1_000_000 : m[2].toUpperCase() === 'K' ? 1_000 : 1_000_000_000
    return sum + n * mult
  }, 0)
  if (total >= 1_000_000) return `$${(total / 1_000_000).toFixed(1)}M`
  return `$${Math.round(total / 1_000)}K`
}
