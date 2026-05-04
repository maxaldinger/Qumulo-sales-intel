'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { Intel, Signal, SIGNAL_ICONS, SCORE_COLORS } from '@/lib/types'

function ScoreBar({ score, color }: { score: number; color: string }) {
  const bg = { green: 'bg-emerald-500', yellow: 'bg-yellow-500', orange: 'bg-orange-500', red: 'bg-red-500' }[color] || 'bg-slate-500'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full ${bg} rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-sm font-bold ${SCORE_COLORS[color] || 'text-slate-400'}`}>{score}/100</span>
    </div>
  )
}

export default function IntelCard({ intel }: { intel: Intel }) {
  const [copied, setCopied] = useState(false)

  const copyOutreach = () => {
    navigator.clipboard.writeText(`Subject: ${intel.email_subject}\n\n${intel.outreach_angle}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">{intel.company_name}</h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
            {intel.ticker && <span className="font-mono">{intel.ticker}</span>}
            {intel.hq && <span>{intel.hq}</span>}
            <span className="px-2 py-0.5 rounded bg-white/5">{intel.primary_vertical}</span>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${SCORE_COLORS[intel.relevance_color] || 'text-slate-400'}`}>
            {intel.relevance_score}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400">{intel.relevance_label}</div>
        </div>
      </div>

      <ScoreBar score={intel.relevance_score} color={intel.relevance_color} />

      {/* Snapshot */}
      <p className="text-sm text-slate-300 leading-relaxed">{intel.snapshot}</p>

      {/* Qumulo Fit + Data Challenge */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-qumulo-orange/10 border border-qumulo-orange/20">
          <div className="text-[10px] uppercase tracking-wider text-qumulo-orange mb-1">Qumulo Fit</div>
          <p className="text-xs text-slate-300">{intel.qumulo_fit}</p>
        </div>
        <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
          <div className="text-[10px] uppercase tracking-wider text-violet-400 mb-1">Data Challenge</div>
          <p className="text-xs text-slate-300">{intel.data_challenge}</p>
        </div>
      </div>

      {/* Signals */}
      {intel.signals?.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Signals</h4>
          <div className="space-y-1.5">
            {intel.signals.map((s: Signal, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="mt-0.5">{SIGNAL_ICONS[s.type] || '\u{1F4CC}'}</span>
                <span className="flex-1 text-slate-300">{s.text}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                  s.urgency === 'high' ? 'bg-red-500/20 text-red-300'
                    : s.urgency === 'medium' ? 'bg-yellow-500/20 text-yellow-300'
                    : 'bg-slate-500/20 text-slate-400'
                }`}>{s.urgency}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Target Contacts */}
      {intel.target_contacts?.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Target Contacts</h4>
          <div className="grid grid-cols-2 gap-2">
            {intel.target_contacts.map((c, i) => (
              <div key={i} className="p-2 rounded bg-white/5 text-xs">
                <div className="font-medium text-white">{c.title}</div>
                <div className="text-slate-400">{c.department}</div>
                <div className="text-slate-500 mt-1">{c.why_target}</div>
                <a
                  href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(c.linkedin_search)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1 text-cyan-400 hover:text-cyan-300"
                >
                  LinkedIn <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outreach */}
      <div className="p-3 rounded-lg bg-white/5 border border-white/10">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Outreach Copy</h4>
          <button onClick={copyOutreach} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
            {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
          </button>
        </div>
        <div className="text-xs">
          <span className="text-slate-400">Subject:</span>{' '}
          <span className="text-white font-medium">{intel.email_subject}</span>
        </div>
        <p className="text-xs text-slate-300 mt-1">{intel.outreach_angle}</p>
      </div>

      {/* Talking Points */}
      {intel.talking_points?.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Talking Points</h4>
          <ul className="space-y-1">
            {intel.talking_points.map((tp, i) => (
              <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="text-cyan-500 mt-0.5">&#x2022;</span>
                {tp}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risk */}
      {(intel.competitor_risk || intel.risk_flags?.length > 0) && (
        <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
          <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">Risk Factors</h4>
          {intel.competitor_risk && <p className="text-xs text-slate-300">{intel.competitor_risk}</p>}
          {intel.risk_flags?.map((f, i) => (
            <span key={i} className="inline-block mt-1 mr-1 px-2 py-0.5 text-[10px] rounded bg-red-500/10 text-red-300">{f}</span>
          ))}
        </div>
      )}
    </div>
  )
}
