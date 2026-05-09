'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, ChevronDown, ChevronUp, Clock, Zap, Building2, TrendingUp, Search, Copy, Check, X, ArrowRight, Info } from 'lucide-react'
import { Company, TimelineEntry, Intel, VERTICALS, VERTICAL_COLORS, URGENCY_COLORS, SIGNAL_ICONS, SIGNAL_LABELS } from '@/lib/types'
import IntelCard from './intel-card'

const SEARCH_STEPS = [
  'Scanning public records...',
  'Fetching news & contracts...',
  'Scraping company website...',
  'Running Qumulo fit analysis...',
  'Building intelligence brief...',
]

export default function SignalFeed() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fetchedAt, setFetchedAt] = useState('')
  const [isCached, setIsCached] = useState(false)
  const [filter, setFilter] = useState('all')
  const [urgencyFilter, setUrgencyFilter] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [intel, setIntel] = useState<Record<string, Intel>>({})
  const [timeline, setTimeline] = useState<Record<string, TimelineEntry[]>>({})
  const [analyzing, setAnalyzing] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState<Record<string, string>>({})

  // Company search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchStep, setSearchStep] = useState(0)
  const [searchResult, setSearchResult] = useState<Intel | null>(null)
  const [searchError, setSearchError] = useState('')
  const [searchCopied, setSearchCopied] = useState(false)

  const fetchFeed = async (force = false) => {
    setLoading(true)
    setError('')
    try {
      const r = await fetch(`/api/feed${force ? '?force=1' : ''}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed to fetch')
      setCompanies(d.companies || [])
      setFetchedAt(d.fetched_at || '')
      setIsCached(d.cached || false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const analyzeCompany = async (name: string) => {
    setAnalyzing(p => ({ ...p, [name]: true }))
    try {
      const r = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: name }),
      })
      const d = await r.json()
      if (d.intel) setIntel(p => ({ ...p, [name]: d.intel }))
    } catch {}
    setAnalyzing(p => ({ ...p, [name]: false }))
  }

  const fetchTimeline = async (name: string) => {
    try {
      const r = await fetch(`/api/timeline?company=${encodeURIComponent(name)}`)
      const d = await r.json()
      if (d.timeline) setTimeline(p => ({ ...p, [name]: d.timeline }))
    } catch {}
  }

  const toggleExpand = (name: string) => {
    if (expanded === name) {
      setExpanded(null)
    } else {
      setExpanded(name)
      if (!intel[name]) analyzeCompany(name)
      if (!timeline[name]) fetchTimeline(name)
    }
  }

  const searchCompany = async () => {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    setSearchError('')
    setSearchResult(null)
    setSearchStep(0)

    const stepTimer = setInterval(() => {
      setSearchStep(s => (s < SEARCH_STEPS.length - 1 ? s + 1 : s))
    }, 2800)

    try {
      const isUrl = searchQuery.includes('.') && !searchQuery.includes(' ')
      const r = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isUrl ? { company: searchQuery, domain: searchQuery } : { company: searchQuery }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Analysis failed')
      setSearchResult(d.intel)
    } catch (e: any) {
      setSearchError(e.message)
    } finally {
      clearInterval(stepTimer)
      setSearchLoading(false)
    }
  }

  /**
   * Open Sales Assist with this account pre-selected. We use the SPA's
   * tab-routing (page.tsx reads ?tab=) — Next App Router updates the URL
   * client-side and useSearchParams in page.tsx + sales-assist.tsx reacts.
   */
  const openInSalesAssist = (accountName: string) => {
    const params = new URLSearchParams({ tab: 'sales-assist', account: accountName })
    router.push(`/?${params.toString()}`)
  }

  const copyBrief = () => {
    if (!searchResult) return
    const text = `${searchResult.company_name} - Qumulo Intelligence Brief\n\nRelevance: ${searchResult.relevance_score}/100 (${searchResult.relevance_label})\n\n${searchResult.snapshot}\n\nQumulo Fit: ${searchResult.qumulo_fit}\nData Challenge: ${searchResult.data_challenge}\n\nOutreach:\nSubject: ${searchResult.email_subject}\n${searchResult.outreach_angle}\n\nTalking Points:\n${searchResult.talking_points?.map((t: string) => `- ${t}`).join('\n')}`
    navigator.clipboard.writeText(text)
    setSearchCopied(true)
    setTimeout(() => setSearchCopied(false), 2000)
  }

  useEffect(() => { fetchFeed() }, [])

  const filtered = companies.filter(c => {
    if (filter !== 'all' && c.vertical_id !== filter) return false
    if (urgencyFilter !== 'all' && c.urgency !== urgencyFilter) return false
    return true
  })

  const highCount = companies.filter(c => c.urgency === 'high').length
  const totalSignals = companies.reduce((s, c) => s + c.signal_count, 0)
  const verticalSet = new Set(companies.map(c => c.vertical_id))

  return (
    <div className="space-y-6">
      {/* Company Search Bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchCompany()}
            placeholder="Deep-dive any company (name or domain) for Qumulo fit analysis"
            className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 text-sm"
          />
        </div>
        <button
          onClick={searchCompany}
          disabled={searchLoading || !searchQuery.trim()}
          className="px-6 rounded-xl bg-sherpa text-white font-medium text-sm hover:bg-[#005068] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {searchLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Analyze'}
        </button>
      </div>

      {/* Search Loading */}
      {searchLoading && (
        <div className="p-6 rounded-xl bg-white/[0.03] border border-white/10">
          <div className="space-y-2">
            {SEARCH_STEPS.map((s, i) => (
              <div key={i} className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                i < searchStep ? 'text-emerald-400' : i === searchStep ? 'text-cyan-400' : 'text-slate-600'
              }`}>
                {i < searchStep ? <Check className="w-4 h-4" /> : i === searchStep ? <RefreshCw className="w-4 h-4 animate-spin" /> : <div className="w-4 h-4 rounded-full border border-slate-600" />}
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Error */}
      {searchError && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{searchError}</div>
      )}

      {/* Search Result */}
      {searchResult && (
        <div className="p-6 rounded-xl bg-white/[0.02] border border-cyan-500/20">
          <div className="flex justify-between mb-4">
            <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold">Company Intel</span>
            <div className="flex items-center gap-3">
              <button onClick={copyBrief} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                {searchCopied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy Brief</>}
              </button>
              <button onClick={() => setSearchResult(null)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <IntelCard intel={searchResult} />
        </div>
      )}

      {/* Sources / enrichment note */}
      <div className="flex items-start gap-2 text-[11px] text-slate-500">
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-600" />
        <p>
          Free public sources only: Google News RSS, USAspending.gov, NIH Reporter, SAM.gov, NSF Awards, SEC EDGAR, HPCwire, FierceHealthcare.
          Paid enrichment (ZoomInfo / Apollo / Lusha) would significantly expand contact and intent coverage.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Companies Tracked', value: companies.length, Icon: Building2, color: 'text-cyan-400' },
          { label: 'High Urgency', value: highCount, Icon: Zap, color: 'text-red-400' },
          { label: 'Total Signals', value: totalSignals, Icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Verticals Active', value: verticalSet.size, Icon: Clock, color: 'text-violet-400' },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs text-slate-400">{label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
          </div>
        ))}
      </div>

      {/* Filters + Refresh */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === 'all' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            All
          </button>
          {VERTICALS.map(v => (
            <button
              key={v.id}
              onClick={() => setFilter(v.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === v.id
                  ? `${VERTICAL_COLORS[v.id]} border`
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {['all', 'high', 'medium', 'low'].map(u => (
            <button
              key={u}
              onClick={() => setUrgencyFilter(u)}
              className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider transition-all ${
                urgencyFilter === u
                  ? u === 'all' ? 'bg-white/10 text-white' : URGENCY_COLORS[u]
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {u}
            </button>
          ))}
          <button
            onClick={() => fetchFeed(true)}
            disabled={loading}
            className="ml-2 p-2 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status */}
      {fetchedAt && (
        <div className="text-xs text-slate-500 flex items-center gap-2">
          {isCached ? 'Cached' : 'Live'} &middot; {new Date(fetchedAt).toLocaleString()}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>
      )}

      {/* Loading */}
      {loading && companies.length === 0 && (
        <div className="text-center py-20">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Scanning signals across Qumulo ICP verticals...</p>
        </div>
      )}

      {/* Company List */}
      <div className="space-y-3">
        {filtered.map(c => (
          <div key={c.company} className="rounded-xl bg-white/[0.03] border border-white/10 overflow-hidden hover:border-white/20 transition-all">
            <button
              onClick={() => toggleExpand(c.company)}
              className="w-full p-4 flex items-center gap-4 text-left"
            >
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                c.urgency === 'high' ? 'bg-red-500' : c.urgency === 'medium' ? 'bg-yellow-500' : 'bg-slate-500'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-white truncate">{c.company}</span>
                  {c.amount && <span className="text-xs text-emerald-400 font-mono">{c.amount}</span>}
                </div>
                <p className="text-xs text-slate-400 truncate">{c.top_signal}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${VERTICAL_COLORS[c.vertical_id] || 'bg-white/5 text-slate-400'}`}>
                  {c.vertical_label}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${URGENCY_COLORS[c.urgency] || ''}`}>
                  {c.urgency}
                </span>
                <span className="text-xs text-slate-500">{c.signal_count}s</span>
                {expanded === c.company ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {expanded === c.company && (
              <div className="border-t border-white/10 p-4">
                {/* Why Qumulo */}
                <div className="mb-4 p-3 rounded-lg bg-sherpa/5 border border-cyan-500/15">
                  <span className="text-[10px] uppercase tracking-wider text-cyan-400">Why Qumulo</span>
                  <p className="text-sm text-slate-300 mt-1">{c.why_qumulo}</p>
                </div>

                {/* Per-card actions */}
                <div className="flex items-center justify-end mb-3">
                  <button
                    type="button"
                    onClick={() => openInSalesAssist(c.company)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200 border border-cyan-500/30 text-xs font-medium transition-all"
                    title={`Open Sales Assist focused on ${c.company}`}
                  >
                    Open in Sales Assist
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-4 border-b border-white/10">
                  {['intel', 'timeline'].map(t => (
                    <button
                      key={t}
                      onClick={() => setActiveTab(p => ({ ...p, [c.company]: t }))}
                      className={`pb-2 text-xs font-medium capitalize border-b-2 transition-all ${
                        (activeTab[c.company] || 'intel') === t
                          ? 'border-cyan-400 text-white' : 'border-transparent text-slate-400'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {(activeTab[c.company] || 'intel') === 'intel' && (
                  analyzing[c.company] ? (
                    <div className="text-center py-8">
                      <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin mx-auto mb-2" />
                      <p className="text-xs text-slate-400">Analyzing {c.company}...</p>
                    </div>
                  ) : intel[c.company] ? (
                    <IntelCard intel={intel[c.company]} />
                  ) : (
                    <p className="text-xs text-slate-500 py-4 text-center">Loading intelligence...</p>
                  )
                )}

                {(activeTab[c.company] || 'intel') === 'timeline' && (
                  <div className="space-y-2">
                    {(timeline[c.company] || []).length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">No timeline data yet</p>
                    ) : (
                      timeline[c.company].map(t => (
                        <div key={t.id} className="flex items-start gap-3 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 flex-shrink-0" />
                          <div className="flex-1">
                            <span className="text-slate-300">{t.signal_text}</span>
                            <div className="flex items-center gap-2 mt-0.5 text-slate-500">
                              <span>{SIGNAL_ICONS[t.signal_type] || ''} {SIGNAL_LABELS[t.signal_type] || t.signal_type}</span>
                              {t.signal_date && <span>{t.signal_date}</span>}
                            </div>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${URGENCY_COLORS[t.urgency] || ''}`}>
                            {t.urgency}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {!loading && filtered.length === 0 && companies.length > 0 && (
        <p className="text-center text-slate-500 py-8">No companies match current filters</p>
      )}
    </div>
  )
}
