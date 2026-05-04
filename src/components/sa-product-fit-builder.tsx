'use client'

import { useState } from 'react'
import { Package, Sparkles, RefreshCw, AlertTriangle, XCircle, CheckCircle, HelpCircle } from 'lucide-react'
import FollowUpChat from './sa-follow-up-chat'

interface ProductFit {
  product: string
  score: number
  fit_label: string
  reasoning: string
  evidence: string[]
}

interface DiscoveryGap {
  area: string
  question: string
  why_important: string
}

interface RedFlag {
  flag: string
  severity: string
  detail: string
}

interface NotAFit {
  product: string
  reason: string
}

interface FitResults {
  overall_score: number
  overall_label: string
  overall_summary: string
  products: ProductFit[]
  discovery_gaps: DiscoveryGap[]
  red_flags: RedFlag[]
  not_a_fit: NotAFit[]
}

interface Props {
  dealName: string | null
}

function scoreColor(score: number) {
  if (score >= 80) return { bar: 'bg-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-500/10' }
  if (score >= 60) return { bar: 'bg-cyan-500', text: 'text-cyan-400', bg: 'bg-cyan-500/10' }
  if (score >= 40) return { bar: 'bg-yellow-500', text: 'text-yellow-400', bg: 'bg-yellow-500/10' }
  if (score >= 20) return { bar: 'bg-orange-500', text: 'text-orange-400', bg: 'bg-orange-500/10' }
  return { bar: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/10' }
}

function severityStyle(severity: string) {
  switch (severity.toLowerCase()) {
    case 'high': return 'text-red-400 bg-red-500/10 border-red-500/20'
    case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
    case 'low': return 'text-slate-400 bg-white/5 border-white/10'
    default: return 'text-slate-400 bg-white/5 border-white/10'
  }
}

export default function SaProductFitBuilder({ dealName }: Props) {
  const [mode, setMode] = useState<'input' | 'results'>('input')
  const [notes, setNotes] = useState('')
  const [results, setResults] = useState<FitResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const analyze = async () => {
    if (!notes.trim()) return
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/sa-product-fit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, dealName }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed to analyze product fit')
      setResults(d.results)
      setMode('results')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const overallColors = results ? scoreColor(results.overall_score) : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Product Fit Analysis</h2>
        <p className="text-sm text-slate-400">
          Analyze meeting notes across Unstructured Data Scale, Cloud Posture, Workload Fit, Incumbent Displacement, Multi-Protocol & Namespace Need, and Economic Pressure.
        </p>
      </div>

      {mode === 'input' && (
        <div className="space-y-4">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Paste meeting notes, requirements, pain points, or discovery call details..."
            rows={12}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 text-sm resize-none leading-relaxed"
          />
          <button
            onClick={analyze}
            disabled={loading || !notes.trim()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sherpa text-white font-medium text-sm hover:bg-[#005068] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Analyzing Product Fit...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze Product Fit
              </>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>
      )}

      {mode === 'results' && results && (
        <div className="space-y-6">
          {/* Back button */}
          <button
            onClick={() => setMode('input')}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors"
          >
            Edit Notes
          </button>

          {/* Overall fit card */}
          <div className="p-6 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-6">
              <div className={`w-20 h-20 rounded-2xl ${overallColors?.bg} flex flex-col items-center justify-center flex-shrink-0`}>
                <span className={`text-3xl font-bold ${overallColors?.text}`}>{results.overall_score}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">{results.overall_label}</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">Overall Product Fit</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{results.overall_summary}</p>
              </div>
            </div>
          </div>

          {/* Product fit cards */}
          {results.products.length > 0 && (
            <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <Package className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">Product Fit Scores</h3>
              </div>
              <div className="space-y-4">
                {results.products.map((p, i) => {
                  const colors = scoreColor(p.score)
                  return (
                    <div key={i} className="p-4 rounded-lg bg-white/5 border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">{p.product}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs ${colors.text}`}>{p.fit_label}</span>
                          <span className={`text-sm font-bold ${colors.text}`}>{p.score}</span>
                        </div>
                      </div>
                      {/* Score bar */}
                      <div className="w-full h-1.5 rounded-full bg-white/5 mb-3">
                        <div
                          className={`h-full rounded-full ${colors.bar} transition-all duration-700`}
                          style={{ width: `${p.score}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{p.reasoning}</p>
                      {p.evidence.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {p.evidence.map((e, j) => (
                            <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5">
                              {e}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Discovery gaps */}
          {results.discovery_gaps.length > 0 && (
            <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">Discovery Gaps</h3>
              </div>
              <div className="space-y-3">
                {results.discovery_gaps.map((gap, i) => (
                  <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {gap.area}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-white mt-1">{gap.question}</p>
                    <p className="text-xs text-slate-400 mt-1">{gap.why_important}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Red flags */}
          {results.red_flags.length > 0 && (
            <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="text-sm font-semibold text-white">Red Flags</h3>
              </div>
              <div className="space-y-3">
                {results.red_flags.map((rf, i) => (
                  <div key={i} className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${severityStyle(rf.severity)}`}>
                        {rf.severity}
                      </span>
                      <span className="text-sm font-medium text-white">{rf.flag}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{rf.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Not a fit */}
          {results.not_a_fit.length > 0 && (
            <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <XCircle className="w-5 h-5 text-slate-500" />
                <h3 className="text-sm font-semibold text-white">Not a Fit</h3>
              </div>
              <div className="space-y-2">
                {results.not_a_fit.map((nf, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                    <XCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-300">{nf.product}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{nf.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up chat */}
          <FollowUpChat
            context={JSON.stringify(results)}
            tool="product-fit"
            dealName={dealName}
          />
        </div>
      )}
    </div>
  )
}
