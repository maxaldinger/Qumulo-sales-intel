'use client'

import { useState } from 'react'
import { Target, Sparkles, RefreshCw, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import FollowUpChat from './sa-follow-up-chat'

/* ── Types ──────────────────────────────────────────────── */

type Status = 'strong' | 'weak' | 'missing' | 'unknown'

interface MeddpiccField {
  key: string
  letter: string
  label: string
  hint: string
  status: Status
  evidence: string
  gap: string
}

interface Props {
  dealName: string | null
}

/* ── Initial field definitions ─────────────────────────── */

const INITIAL_FIELDS: MeddpiccField[] = [
  { key: 'm',  letter: 'M', label: 'Metrics',           hint: 'What quantifiable business outcomes does the customer care about? Revenue impact, cost savings, time reduction, risk mitigation.',                         status: 'unknown', evidence: '', gap: '' },
  { key: 'e',  letter: 'E', label: 'Economic Buyer',    hint: 'Who has the budget authority and can sign off on this deal? Title, relationship access, level of engagement.',                                             status: 'unknown', evidence: '', gap: '' },
  { key: 'dc', letter: 'D', label: 'Decision Criteria',  hint: 'What technical, business, and cultural criteria will drive their decision? Requirements, must-haves, evaluation rubric.',                                 status: 'unknown', evidence: '', gap: '' },
  { key: 'dp', letter: 'D', label: 'Decision Process',   hint: 'What are the steps, approvals, and timeline to get from evaluation to signed contract? POC, legal review, board approval.',                              status: 'unknown', evidence: '', gap: '' },
  { key: 'p',  letter: 'P', label: 'Paper Process',      hint: 'What procurement, legal, security, and compliance reviews are required? MSA, SOW, InfoSec questionnaire, procurement cycle.',                            status: 'unknown', evidence: '', gap: '' },
  { key: 'i',  letter: 'I', label: 'Implicate the Pain', hint: 'What is the business pain, and what happens if they do nothing? Quantify the cost of inaction. Connect pain to urgency.',                                status: 'unknown', evidence: '', gap: '' },
  { key: 'ch', letter: 'C', label: 'Champion',           hint: 'Who is your internal advocate? Do they have power, influence, and a personal win tied to this initiative?',                                              status: 'unknown', evidence: '', gap: '' },
  { key: 'co', letter: 'C', label: 'Competition',        hint: 'Who or what are you competing against? Other vendors, internal builds, open-source alternatives, or simply doing nothing.',                              status: 'unknown', evidence: '', gap: '' },
]

/* ── Status styling ────────────────────────────────────── */

const STATUS_CONFIG: Record<Status, { bg: string; border: string; text: string; label: string }> = {
  strong:  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'Strong' },
  weak:    { bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',  text: 'text-yellow-400',  label: 'Weak' },
  missing: { bg: 'bg-red-500/10',     border: 'border-red-500/30',     text: 'text-red-400',     label: 'Missing' },
  unknown: { bg: 'bg-white/[0.03]',   border: 'border-white/10',       text: 'text-slate-500',   label: 'Not Set' },
}

/* ── Component ─────────────────────────────────────────── */

export default function SaMeddpiccBuilder({ dealName }: Props) {
  const [fields, setFields] = useState<MeddpiccField[]>(INITIAL_FIELDS.map(f => ({ ...f })))
  const [account, setAccount] = useState(dealName || '')
  const [notesForAi, setNotesForAi] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)

  /* ── Update a single field ── */
  const updateField = (key: string, patch: Partial<MeddpiccField>) => {
    setFields(prev => prev.map(f => f.key === key ? { ...f, ...patch } : f))
  }

  /* ── AI-fill from notes ── */
  const runAiAnalysis = async () => {
    if (!notesForAi.trim()) return
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/meddpicc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesForAi, account }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Analysis failed')

      const analysis = d.analysis
      if (analysis?.meddpicc && Array.isArray(analysis.meddpicc)) {
        const apiFields = analysis.meddpicc as { letter: string; label: string; status: string; evidence: string; gap: string }[]
        setFields(prev => prev.map((field, idx) => {
          const match = apiFields[idx]
          if (!match) return field
          return {
            ...field,
            status: (['strong', 'weak', 'missing', 'unknown'].includes(match.status) ? match.status : 'unknown') as Status,
            evidence: match.evidence || '',
            gap: match.gap || '',
          }
        }))
        setHasGenerated(true)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  /* ── Scoring ── */
  const scored = fields.filter(f => f.status !== 'unknown')
  const strongCount = fields.filter(f => f.status === 'strong').length
  const weakCount = fields.filter(f => f.status === 'weak').length
  const missingCount = fields.filter(f => f.status === 'missing').length
  const unknownCount = fields.filter(f => f.status === 'unknown').length
  const score = fields.reduce((sum, f) => {
    if (f.status === 'strong') return sum + 100
    if (f.status === 'weak') return sum + 50
    return sum
  }, 0)
  const maxScore = fields.length * 100
  const pct = Math.round((score / maxScore) * 100)
  const healthLabel = pct >= 75 ? 'Well Qualified' : pct >= 50 ? 'Needs Work' : pct >= 25 ? 'At Risk' : scored.length === 0 ? 'Not Started' : 'Critical Gaps'
  const healthColor = pct >= 75 ? 'text-emerald-400' : pct >= 50 ? 'text-yellow-400' : pct >= 25 ? 'text-orange-400' : 'text-red-400'
  const barColor = pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-yellow-500' : pct >= 25 ? 'bg-orange-500' : 'bg-red-500'

  /* ── Copy scorecard as text ── */
  const copyScorecard = async () => {
    const lines = [
      `MEDDPICC Scorecard${account ? ` — ${account}` : ''}`,
      `Overall: ${pct}% (${healthLabel})`,
      '',
      ...fields.map(f => {
        const parts = [`[${f.letter}] ${f.label} — ${f.status.toUpperCase()}`]
        if (f.evidence) parts.push(`   Evidence: ${f.evidence}`)
        if (f.gap) parts.push(`   Gap: ${f.gap}`)
        return parts.join('\n')
      }),
    ]
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white mb-1">MEDDPICC Scorecard</h2>
        <p className="text-sm text-slate-400">
          Paste meeting notes below and hit Analyze — only the topics you actually discussed get filled in. Edit or add to any field after.
        </p>
      </div>

      {/* Notes input — always visible */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={account}
            onChange={e => setAccount(e.target.value)}
            placeholder="Account name (e.g. JPMorgan Chase)"
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 text-sm"
          />
          <button
            onClick={copyScorecard}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-all"
          >
            {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
          </button>
        </div>
        <textarea
          value={notesForAi}
          onChange={e => setNotesForAi(e.target.value)}
          placeholder="Paste meeting notes, call transcripts, or email threads here. AI will only fill in the MEDDPICC fields that were actually discussed..."
          rows={6}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 text-sm resize-none leading-relaxed"
        />
        <button
          onClick={runAiAnalysis}
          disabled={loading || !notesForAi.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sherpa text-white font-medium text-sm hover:bg-[#005068] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing Notes...</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Analyze &amp; Fill Scorecard</>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>
      )}

      {/* Overall health bar */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-white">Deal Qualification</span>
          </div>
          <span className={`text-sm font-semibold ${healthColor}`}>{pct}% — {healthLabel}</span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs">
          <span className="text-emerald-400">{strongCount} strong</span>
          <span className="text-yellow-400">{weakCount} weak</span>
          <span className="text-red-400">{missingCount} missing</span>
          {unknownCount > 0 && <span className="text-slate-500">{unknownCount} not set</span>}
        </div>
      </div>

      {/* MEDDPICC field cards */}
      <div className="space-y-2">
        {fields.map((field) => {
          const style = STATUS_CONFIG[field.status]
          const isExpanded = expanded === field.key

          return (
            <div key={field.key} className={`rounded-xl border transition-all ${style.border} ${style.bg}`}>
              {/* Collapsed row */}
              <button
                onClick={() => setExpanded(isExpanded ? null : field.key)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer"
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${style.text} bg-white/5 flex-shrink-0`}>
                  {field.letter}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{field.label}</span>
                    {field.evidence && !isExpanded && (
                      <span className="text-xs text-slate-500 truncate max-w-[300px]">&mdash; {field.evidence}</span>
                    )}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide ${style.text} bg-white/5`}>
                  {style.label}
                </span>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>

              {/* Expanded edit panel */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                  <p className="text-xs text-slate-400 italic">{field.hint}</p>

                  {/* Status toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-12">Status:</span>
                    {(['strong', 'weak', 'missing'] as Status[]).map(s => {
                      const sc = STATUS_CONFIG[s]
                      const isActive = field.status === s
                      return (
                        <button
                          key={s}
                          onClick={() => updateField(field.key, { status: s })}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer
                            ${isActive
                              ? `${sc.border} ${sc.text} ${sc.bg}`
                              : 'border-white/10 text-slate-500 hover:border-white/20'
                            }`}
                        >
                          {sc.label}
                        </button>
                      )
                    })}
                  </div>

                  {/* Evidence */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Evidence — What do we know?</label>
                    <textarea
                      value={field.evidence}
                      onChange={e => updateField(field.key, { evidence: e.target.value })}
                      placeholder="What the notes, calls, or research reveal..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 text-sm resize-none leading-relaxed"
                    />
                  </div>

                  {/* Gap */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Gap — What do we still need?</label>
                    <textarea
                      value={field.gap}
                      onChange={e => updateField(field.key, { gap: e.target.value })}
                      placeholder="What discovery or validation is still needed..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 text-sm resize-none leading-relaxed"
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Follow-up chat (show after AI fill or manual edits) */}
      {(hasGenerated || fields.some(f => f.status !== 'unknown')) && (
        <FollowUpChat
          context={JSON.stringify({ account, fields: fields.map(f => ({ letter: f.letter, label: f.label, status: f.status, evidence: f.evidence, gap: f.gap })) })}
          tool="meddpicc"
          dealName={dealName}
        />
      )}
    </div>
  )
}
