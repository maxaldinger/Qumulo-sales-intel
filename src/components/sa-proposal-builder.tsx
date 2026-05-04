'use client'

import { useState } from 'react'
import { FileText, Sparkles, RefreshCw, Copy, Pencil, Check } from 'lucide-react'
import FollowUpChat from './sa-follow-up-chat'

interface BusinessChallenge {
  challenge: string
  detail: string
}

interface NextStep {
  step: string
  description: string
}

interface Proposal {
  title: string
  date: string
  executive_summary: string
  business_challenges: BusinessChallenge[]
  recommended_solution: string
  why_us: string
  next_steps: NextStep[]
  closing_statement: string
}

interface Props {
  dealName: string | null
}

export default function SaProposalBuilder({ dealName }: Props) {
  const [mode, setMode] = useState<'input' | 'proposal'>('input')
  const [notes, setNotes] = useState('')
  const [products, setProducts] = useState('')
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [editField, setEditField] = useState<string | null>(null)

  const generate = async () => {
    if (!notes.trim()) return
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/sa-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, products, dealName }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed to generate proposal')
      setProposal(d.proposal)
      setMode('proposal')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const copyProposal = async () => {
    if (!proposal) return
    const text = [
      proposal.title,
      `Date: ${proposal.date}`,
      '',
      'EXECUTIVE SUMMARY',
      proposal.executive_summary,
      '',
      'BUSINESS CHALLENGES',
      ...proposal.business_challenges.map(
        (c, i) => `${i + 1}. ${c.challenge}\n   ${c.detail}`
      ),
      '',
      'RECOMMENDED SOLUTION',
      proposal.recommended_solution,
      '',
      'WHY US',
      proposal.why_us,
      '',
      'NEXT STEPS',
      ...proposal.next_steps.map(
        (s, i) => `${i + 1}. ${s.step} - ${s.description}`
      ),
      '',
      proposal.closing_statement,
    ].join('\n')

    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const updateField = (field: keyof Proposal, value: any) => {
    if (!proposal) return
    setProposal({ ...proposal, [field]: value })
  }

  const updateChallenge = (index: number, key: keyof BusinessChallenge, value: string) => {
    if (!proposal) return
    const updated = [...proposal.business_challenges]
    updated[index] = { ...updated[index], [key]: value }
    setProposal({ ...proposal, business_challenges: updated })
  }

  const updateStep = (index: number, key: keyof NextStep, value: string) => {
    if (!proposal) return
    const updated = [...proposal.next_steps]
    updated[index] = { ...updated[index], [key]: value }
    setProposal({ ...proposal, next_steps: updated })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Proposal Builder</h2>
        <p className="text-sm text-slate-400">
          Generate a structured proposal from meeting notes and suggested products.
        </p>
      </div>

      {mode === 'input' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Meeting Notes / Context</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Paste meeting notes, key requirements, pain points discussed..."
              rows={10}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 text-sm resize-none leading-relaxed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Suggested Products (optional)</label>
            <textarea
              value={products}
              onChange={e => setProducts(e.target.value)}
              placeholder="List products or solutions to recommend, one per line..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 text-sm resize-none leading-relaxed"
            />
          </div>
          <button
            onClick={generate}
            disabled={loading || !notes.trim()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sherpa text-white font-medium text-sm hover:bg-[#005068] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating Proposal...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Proposal
              </>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>
      )}

      {mode === 'proposal' && proposal && (
        <div className="space-y-5">
          {/* Action bar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMode('input')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Inputs
            </button>
            <button
              onClick={copyProposal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm hover:bg-cyan-500/20 transition-colors ml-auto"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Proposal
                </>
              )}
            </button>
          </div>

          {/* Proposal document */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
            {/* Title */}
            <div className="px-8 pt-8 pb-4 border-b border-white/5">
              {editField === 'title' ? (
                <div className="flex items-center gap-2">
                  <input
                    value={proposal.title}
                    onChange={e => updateField('title', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xl font-bold focus:outline-none focus:border-cyan-500/50"
                    autoFocus
                  />
                  <button onClick={() => setEditField(null)} className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-400">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <h3
                  className="text-xl font-bold text-white cursor-pointer hover:text-cyan-400 transition-colors"
                  onClick={() => setEditField('title')}
                >
                  {proposal.title}
                </h3>
              )}
              <p className="text-sm text-slate-500 mt-1">{proposal.date}</p>
            </div>

            <div className="px-8 py-6 space-y-6">
              {/* Executive Summary */}
              <div>
                <h4 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-2">Executive Summary</h4>
                {editField === 'executive_summary' ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={proposal.executive_summary}
                      onChange={e => updateField('executive_summary', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm resize-none focus:outline-none focus:border-cyan-500/50"
                      autoFocus
                    />
                    <button onClick={() => setEditField(null)} className="self-end p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-400">
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <p
                    className="text-sm text-slate-300 leading-relaxed cursor-pointer hover:text-white transition-colors"
                    onClick={() => setEditField('executive_summary')}
                  >
                    {proposal.executive_summary}
                  </p>
                )}
              </div>

              {/* Business Challenges */}
              <div>
                <h4 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-3">Business Challenges</h4>
                <div className="space-y-3">
                  {proposal.business_challenges.map((c, i) => (
                    <div key={i} className="p-4 rounded-lg bg-white/5 border border-white/5">
                      {editField === `challenge-${i}` ? (
                        <div className="space-y-2">
                          <input
                            value={c.challenge}
                            onChange={e => updateChallenge(i, 'challenge', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-cyan-500/50"
                            autoFocus
                          />
                          <textarea
                            value={c.detail}
                            onChange={e => updateChallenge(i, 'detail', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm resize-none focus:outline-none focus:border-cyan-500/50"
                          />
                          <button onClick={() => setEditField(null)} className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-400">
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setEditField(`challenge-${i}`)}
                        >
                          <p className="text-sm font-medium text-white">{c.challenge}</p>
                          <p className="text-sm text-slate-400 mt-1">{c.detail}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Solution */}
              <div>
                <h4 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-2">Recommended Solution</h4>
                {editField === 'recommended_solution' ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={proposal.recommended_solution}
                      onChange={e => updateField('recommended_solution', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm resize-none focus:outline-none focus:border-cyan-500/50"
                      autoFocus
                    />
                    <button onClick={() => setEditField(null)} className="self-end p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-400">
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <p
                    className="text-sm text-slate-300 leading-relaxed cursor-pointer hover:text-white transition-colors"
                    onClick={() => setEditField('recommended_solution')}
                  >
                    {proposal.recommended_solution}
                  </p>
                )}
              </div>

              {/* Why Us */}
              <div>
                <h4 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-2">Why Us</h4>
                {editField === 'why_us' ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={proposal.why_us}
                      onChange={e => updateField('why_us', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm resize-none focus:outline-none focus:border-cyan-500/50"
                      autoFocus
                    />
                    <button onClick={() => setEditField(null)} className="self-end p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-400">
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <p
                    className="text-sm text-slate-300 leading-relaxed cursor-pointer hover:text-white transition-colors"
                    onClick={() => setEditField('why_us')}
                  >
                    {proposal.why_us}
                  </p>
                )}
              </div>

              {/* Next Steps */}
              <div>
                <h4 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-3">Next Steps</h4>
                <ol className="space-y-3">
                  {proposal.next_steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center text-xs text-cyan-400 flex-shrink-0 mt-0.5 font-medium">
                        {i + 1}
                      </span>
                      {editField === `step-${i}` ? (
                        <div className="flex-1 space-y-2">
                          <input
                            value={s.step}
                            onChange={e => updateStep(i, 'step', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-cyan-500/50"
                            autoFocus
                          />
                          <input
                            value={s.description}
                            onChange={e => updateStep(i, 'description', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                          />
                          <button onClick={() => setEditField(null)} className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-400">
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setEditField(`step-${i}`)}
                        >
                          <p className="text-sm font-medium text-white">{s.step}</p>
                          <p className="text-sm text-slate-400">{s.description}</p>
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Closing */}
              <div className="pt-4 border-t border-white/5">
                {editField === 'closing_statement' ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={proposal.closing_statement}
                      onChange={e => updateField('closing_statement', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm resize-none focus:outline-none focus:border-cyan-500/50"
                      autoFocus
                    />
                    <button onClick={() => setEditField(null)} className="self-end p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-400">
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <p
                    className="text-sm text-slate-300 italic leading-relaxed cursor-pointer hover:text-white transition-colors"
                    onClick={() => setEditField('closing_statement')}
                  >
                    {proposal.closing_statement}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Follow-up chat */}
          <FollowUpChat
            context={JSON.stringify(proposal)}
            tool="proposal"
            dealName={dealName}
          />
        </div>
      )}
    </div>
  )
}
