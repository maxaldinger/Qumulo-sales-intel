'use client'

import { useState } from 'react'
import { Target, Sparkles, RefreshCw, Users, ArrowRight, FileText, AlertTriangle, CheckCircle } from 'lucide-react'

interface MeddpiccField {
  letter: string
  label: string
  status: 'strong' | 'weak' | 'missing'
  evidence: string
  gap: string
}

interface ThreadingRec {
  persona: string
  why: string
  approach: string
}

interface AnalysisResult {
  meddpicc: MeddpiccField[]
  lou: string
  threading: ThreadingRec[]
  next_steps: string[]
}

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  strong: { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', icon: CheckCircle },
  weak: { bg: 'bg-yellow-500/10 border-yellow-500/20', text: 'text-yellow-400', icon: AlertTriangle },
  missing: { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-400', icon: AlertTriangle },
}

export default function MeddpiccBuilder() {
  const [account, setAccount] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')

  const runAnalysis = async () => {
    if (!notes.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const r = await fetch('/api/meddpicc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, account }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Analysis failed')
      setResult(d.analysis)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const strongCount = result?.meddpicc.filter(f => f.status === 'strong').length || 0
  const weakCount = result?.meddpicc.filter(f => f.status === 'weak').length || 0
  const missingCount = result?.meddpicc.filter(f => f.status === 'missing').length || 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">MEDDPICC Deal Analysis</h2>
        <p className="text-sm text-slate-400">Paste call notes or email threads. Get MEDDPICC gap analysis, a draft LOU, multi-threading recommendations, and next steps.</p>
      </div>

      {/* Input */}
      <div className="space-y-4">
        <input
          type="text"
          value={account}
          onChange={e => setAccount(e.target.value)}
          placeholder="Account name (e.g. JPMorgan Chase)"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 text-sm"
        />
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Paste raw call notes, meeting transcripts, or email threads here..."
          rows={10}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 text-sm resize-none leading-relaxed"
        />
        <button
          onClick={runAnalysis}
          disabled={loading || !notes.trim()}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sherpa text-white font-medium text-sm hover:bg-[#005068] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing...</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Run Analysis</>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* MEDDPICC Gap Analysis */}
          <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">MEDDPICC Gap Analysis</h3>
              <div className="flex items-center gap-3 ml-auto text-xs">
                <span className="text-emerald-400">{strongCount} strong</span>
                <span className="text-yellow-400">{weakCount} weak</span>
                <span className="text-red-400">{missingCount} missing</span>
              </div>
            </div>
            <div className="space-y-2">
              {result.meddpicc.map((f, i) => {
                const style = STATUS_STYLES[f.status] || STATUS_STYLES.missing
                const Icon = style.icon
                return (
                  <div key={i} className={`p-3 rounded-lg border ${style.bg}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${style.text} bg-white/5`}>
                        {f.letter}
                      </span>
                      <span className="text-sm font-medium text-white">{f.label}</span>
                      <span className={`ml-auto flex items-center gap-1 text-xs ${style.text}`}>
                        <Icon className="w-3 h-3" />
                        {f.status}
                      </span>
                    </div>
                    {f.evidence && <p className="text-xs text-slate-300 mt-1">{f.evidence}</p>}
                    {f.gap && <p className="text-xs text-slate-400 mt-1 italic">{f.gap}</p>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Letter of Understanding */}
          <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <FileText className="w-5 h-5 text-violet-400" />
              <h3 className="text-sm font-semibold text-white">Draft Letter of Understanding</h3>
            </div>
            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{result.lou}</div>
          </div>

          {/* Multi-Threading */}
          <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">Multi-Threading Recommendations</h3>
            </div>
            <div className="space-y-3">
              {result.threading.map((t, i) => (
                <div key={i} className="p-3 rounded-lg bg-white/5">
                  <div className="text-sm font-medium text-white">{t.persona}</div>
                  <p className="text-xs text-slate-400 mt-0.5">{t.why}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-cyan-400">
                    <ArrowRight className="w-3 h-3" />
                    {t.approach}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Next Steps */}
          <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <ArrowRight className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Suggested Next Steps</h3>
            </div>
            <ol className="space-y-2">
              {result.next_steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                  <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-xs text-slate-400 flex-shrink-0 mt-0.5">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}
