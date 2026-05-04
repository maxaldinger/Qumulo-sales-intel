'use client'

import { useState } from 'react'
import { Users, Sparkles, RefreshCw, Plus, Trash2, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Mail } from 'lucide-react'
import FollowUpChat from './sa-follow-up-chat'

interface Contact {
  id: string
  name: string
  title: string
  notes: string
}

interface AnalyzedContact {
  name: string
  title: string
  role: string
  role_short: string
  influence: string
  status: string
  assessment: string
}

interface Gap {
  role: string
  role_short: string
  why_critical: string
  target_title: string
  how_to_get_in: string
  outreach_message: string
}

interface Analysis {
  score: number
  score_label: string
  score_color: string
  summary: string
  contacts: AnalyzedContact[]
  gaps: Gap[]
  recommendations: string[]
}

const SCORE_COLORS: Record<string, string> = {
  red: 'text-red-500',
  orange: 'text-orange-500',
  yellow: 'text-yellow-500',
  green: 'text-emerald-500',
}

const SCORE_STROKE_COLORS: Record<string, string> = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#10b981',
}

const ROLE_COLORS: Record<string, string> = {
  Champion: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Economic Buyer': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Technical Buyer': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  'End User': 'bg-green-500/10 text-green-400 border-green-500/20',
  'Legal/Procurement': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  'Executive Sponsor': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
}

function getRoleStyle(role: string) {
  for (const [key, val] of Object.entries(ROLE_COLORS)) {
    if (role.toLowerCase().includes(key.toLowerCase())) return val
  }
  return 'bg-white/5 text-slate-400 border-white/10'
}

interface Props {
  dealName: string | null
}

export default function SaThreadingBuilder({ dealName }: Props) {
  const [mode, setMode] = useState<'input' | 'analysis'>('input')
  const [contacts, setContacts] = useState<Contact[]>([
    { id: '1', name: '', title: '', notes: '' },
  ])
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandedGap, setExpandedGap] = useState<number | null>(null)

  const addContact = () => {
    setContacts(prev => [
      ...prev,
      { id: `c-${Date.now()}`, name: '', title: '', notes: '' },
    ])
  }

  const removeContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  const updateContact = (id: string, field: keyof Contact, value: string) => {
    setContacts(prev =>
      prev.map(c => (c.id === id ? { ...c, [field]: value } : c))
    )
  }

  const analyze = async () => {
    const valid = contacts.filter(c => c.name.trim())
    if (valid.length === 0) return
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/sa-threading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: valid, dealName }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed to analyze threading')
      setAnalysis(d.analysis)
      setMode('analysis')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const scoreRadius = 54
  const scoreCircumference = 2 * Math.PI * scoreRadius
  const scoreOffset = analysis
    ? scoreCircumference - (analysis.score / 100) * scoreCircumference
    : scoreCircumference

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Multi-Threading Analysis</h2>
        <p className="text-sm text-slate-400">
          Add your deal contacts to get a threading score, gap analysis, and outreach recommendations.
        </p>
      </div>

      {mode === 'input' && (
        <div className="space-y-4">
          <div className="space-y-3">
            {contacts.map((contact, i) => (
              <div
                key={contact.id}
                className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Contact {i + 1}</span>
                  {contacts.length > 1 && (
                    <button
                      onClick={() => removeContact(contact.id)}
                      className="p-1 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={contact.name}
                    onChange={e => updateContact(contact.id, 'name', e.target.value)}
                    placeholder="Name"
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 text-sm"
                  />
                  <input
                    value={contact.title}
                    onChange={e => updateContact(contact.id, 'title', e.target.value)}
                    placeholder="Title"
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 text-sm"
                  />
                </div>
                <input
                  value={contact.notes}
                  onChange={e => updateContact(contact.id, 'notes', e.target.value)}
                  placeholder="Notes (e.g., met at discovery call, very engaged)"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 text-sm"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={addContact}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Contact
            </button>
            <button
              onClick={analyze}
              disabled={loading || contacts.filter(c => c.name.trim()).length === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sherpa text-white font-medium text-sm hover:bg-[#005068] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyze Threading
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>
      )}

      {mode === 'analysis' && analysis && (
        <div className="space-y-6">
          {/* Back button */}
          <button
            onClick={() => setMode('input')}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors"
          >
            Edit Contacts
          </button>

          {/* Score card */}
          <div className="p-6 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-8">
              {/* SVG gauge */}
              <div className="relative flex-shrink-0">
                <svg width="140" height="140" viewBox="0 0 140 140">
                  <circle
                    cx="70"
                    cy="70"
                    r={scoreRadius}
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="10"
                  />
                  <circle
                    cx="70"
                    cy="70"
                    r={scoreRadius}
                    fill="none"
                    stroke={SCORE_STROKE_COLORS[analysis.score_color] || '#06b6d4'}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={scoreCircumference}
                    strokeDashoffset={scoreOffset}
                    transform="rotate(-90 70 70)"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-bold ${SCORE_COLORS[analysis.score_color] || 'text-cyan-400'}`}>
                    {analysis.score}
                  </span>
                  <span className="text-xs text-slate-400">{analysis.score_label}</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white mb-2">Threading Score</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{analysis.summary}</p>
              </div>
            </div>
          </div>

          {/* Active Contacts */}
          {analysis.contacts.length > 0 && (
            <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Active Contacts ({analysis.contacts.length})</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {analysis.contacts.map((c, i) => (
                  <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-medium text-white">{c.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${getRoleStyle(c.role)}`}>
                        {c.role_short || c.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{c.title}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="text-slate-500">Influence: <span className="text-slate-300">{c.influence}</span></span>
                      <span className="text-slate-500">Status: <span className="text-slate-300">{c.status}</span></span>
                    </div>
                    {c.assessment && (
                      <p className="text-xs text-slate-400 mt-1.5 italic">{c.assessment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gaps */}
          {analysis.gaps.length > 0 && (
            <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <h3 className="text-sm font-semibold text-white">Threading Gaps ({analysis.gaps.length})</h3>
              </div>
              <div className="space-y-3">
                {analysis.gaps.map((gap, i) => (
                  <div key={i} className="rounded-lg bg-white/5 border border-white/5 overflow-hidden">
                    <button
                      onClick={() => setExpandedGap(expandedGap === i ? null : i)}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${getRoleStyle(gap.role)}`}>
                        {gap.role_short || gap.role}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{gap.role}</p>
                        <p className="text-xs text-slate-400 truncate">{gap.why_critical}</p>
                      </div>
                      {expandedGap === i ? (
                        <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      )}
                    </button>
                    {expandedGap === i && (
                      <div className="px-3 pb-3 space-y-3 border-t border-white/5">
                        <div className="pt-3 space-y-2">
                          <div>
                            <span className="text-xs text-slate-500">Target Title</span>
                            <p className="text-sm text-slate-300">{gap.target_title}</p>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500">How to Get In</span>
                            <p className="text-sm text-slate-300">{gap.how_to_get_in}</p>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <Mail className="w-3 h-3 text-cyan-400" />
                              <span className="text-xs text-cyan-400">Suggested Outreach</span>
                            </div>
                            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                              {gap.outreach_message}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">Recommendations</h3>
              </div>
              <ul className="space-y-2">
                {analysis.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center text-xs text-cyan-400 flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Follow-up chat */}
          <FollowUpChat
            context={JSON.stringify(analysis)}
            tool="threading"
            dealName={dealName}
          />
        </div>
      )}
    </div>
  )
}
