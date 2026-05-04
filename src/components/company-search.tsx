'use client'

import { useState } from 'react'
import { Search, RefreshCw, Copy, Check } from 'lucide-react'
import { Intel } from '@/lib/types'
import IntelCard from './intel-card'

const STEPS = [
  'Scanning public records...',
  'Fetching news & contracts...',
  'Scraping company website...',
  'Running Qumulo fit analysis...',
  'Building intelligence brief...',
]

export default function CompanySearch() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [result, setResult] = useState<Intel | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    setStep(0)

    const stepTimer = setInterval(() => {
      setStep(s => (s < STEPS.length - 1 ? s + 1 : s))
    }, 2800)

    try {
      const isUrl = query.includes('.') && !query.includes(' ')
      const r = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isUrl ? { company: query, domain: query } : { company: query }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Analysis failed')
      setResult(d.intel)
    } catch (e: any) {
      setError(e.message)
    } finally {
      clearInterval(stepTimer)
      setLoading(false)
    }
  }

  const copyAll = () => {
    if (!result) return
    const text = `${result.company_name} - Qumulo Intelligence Brief\n\nRelevance: ${result.relevance_score}/100 (${result.relevance_label})\n\n${result.snapshot}\n\nQumulo Fit: ${result.qumulo_fit}\nData Challenge: ${result.data_challenge}\n\nOutreach:\nSubject: ${result.email_subject}\n${result.outreach_angle}\n\nTalking Points:\n${result.talking_points?.map(t => `- ${t}`).join('\n')}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Company Intelligence</h2>
        <p className="text-sm text-slate-400">Deep-dive any company. Get Qumulo fit assessment, buying signals, and outreach strategy.</p>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Company name or website (e.g. TGen or qumulo.com)"
            className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-qumulo-orange/50 focus:ring-1 focus:ring-qumulo-orange/20 text-sm"
          />
        </div>
        <button
          onClick={search}
          disabled={loading || !query.trim()}
          className="px-6 rounded-xl bg-qumulo-orange text-white font-medium text-sm hover:bg-qumulo-orange-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Analyze'}
        </button>
      </div>

      {loading && (
        <div className="p-6 rounded-xl bg-white/[0.03] border border-white/10">
          <div className="space-y-2">
            {STEPS.map((s, i) => (
              <div key={i} className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                i < step ? 'text-emerald-400' : i === step ? 'text-qumulo-orange' : 'text-slate-600'
              }`}>
                {i < step ? (
                  <Check className="w-4 h-4" />
                ) : i === step ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-600" />
                )}
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>
      )}

      {result && (
        <div className="p-6 rounded-xl bg-white/[0.03] border border-white/10">
          <div className="flex justify-end mb-4">
            <button onClick={copyAll} className="text-xs text-qumulo-orange hover:opacity-80 flex items-center gap-1">
              {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy Brief</>}
            </button>
          </div>
          <IntelCard intel={result} />
        </div>
      )}

      {!loading && !result && !error && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-qumulo-orange/10 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-qumulo-orange/60" />
          </div>
          <p className="text-slate-400 text-sm">Enter a company name to generate a full Qumulo intelligence brief</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            {['TGen', 'Micron Technology', 'NREL'].map(name => (
              <button
                key={name}
                onClick={() => { setQuery(name); }}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 bg-white/5 hover:bg-white/10 transition-all"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
