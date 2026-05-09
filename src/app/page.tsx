'use client'

import { Suspense, useState, useEffect } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Radio, MessageSquare, Map, Network, Shield, ShieldCheck, Users, Sun, Moon } from 'lucide-react'
import SignalFeed from '@/components/signal-feed'
import SalesAssist from '@/components/sales-assist'
import TerritoryPlan from '@/components/territory-plan'
import KnowledgeGraph from '@/components/knowledge-graph'
import AccountPlanning from '@/components/account-planning'

const TABS = [
  { id: 'signals',          label: 'Signal Feed',      Icon: Radio },
  { id: 'sales-assist',     label: 'Sales Assist',     Icon: MessageSquare },
  { id: 'territory',        label: 'Territory Plan',   Icon: Map },
  { id: 'account-planning', label: 'Account Planning', Icon: Users },
]

const ADMIN_TAB = { id: 'graph', label: 'Architecture', Icon: Network }

const VALID_TABS = new Set(['signals', 'sales-assist', 'territory', 'account-planning', 'graph'])

export default function Dashboard() {
  return (
    <Suspense fallback={null}>
      <DashboardInner />
    </Suspense>
  )
}

function DashboardInner() {
  const searchParams = useSearchParams()
  // Initial tab is taken from the URL (?tab=sales-assist) so deep links from
  // Signal Feed land directly on the right tab. Subsequent tab clicks update
  // local state only — we don't push new URLs on every click.
  const initialTab = (() => {
    const t = searchParams.get('tab')
    return t && VALID_TABS.has(t) ? t : 'signals'
  })()
  const [tab, setTab] = useState(initialTab)
  const [admin, setAdmin] = useState(false)
  /**
   * Light/dark toggle. The actual <html data-theme> attribute is set
   * pre-hydration by /theme-init.js. We mirror that into React state
   * here on mount so the toggle button shows the right icon, then
   * write back to <html> + localStorage on every change.
   */
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const t = document.documentElement.getAttribute('data-theme')
      if (t === 'light' || t === 'dark') setTheme(t)
    }
  }, [])

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      try {
        document.documentElement.setAttribute('data-theme', next)
        localStorage.setItem('q-theme', next)
      } catch {
        // localStorage unavailable — DOM update still wins for this session.
      }
      return next
    })
  }

  // Stay reactive to URL changes during the session (e.g. when Signal Feed
  // calls router.push to deep-link into Sales Assist for a specific account).
  useEffect(() => {
    const t = searchParams.get('tab')
    if (t && VALID_TABS.has(t) && t !== tab) setTab(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'G') {
        e.preventDefault()
        setAdmin(p => !p)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const visibleTabs = admin ? [...TABS, ADMIN_TAB] : TABS

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-sherpa bg-[#111827]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/qumulo-mark.svg"
              alt="Qumulo"
              width={56}
              height={56}
              className="opacity-80 flex-shrink-0"
            />
            <div>
              <h1 className="text-lg font-bold tracking-tight">Q-Intel</h1>
              <p className="text-xs text-slate-400">Qumulo Territory Intelligence &mdash; Southwest Commercial</p>
              <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-medium tracking-wide uppercase text-teal-300/80 border border-teal-400/20 rounded-full">
                Built for Qumulo
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {admin && (
              <span className="px-2 py-1 text-[10px] font-bold tracking-widest uppercase bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded">
                Architect Mode
              </span>
            )}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-all"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setAdmin(p => !p)}
              className={`p-2 rounded-lg transition-all ${
                admin
                  ? 'bg-violet-500/20 text-violet-300'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
              title="Toggle Architect Mode (Ctrl+Shift+G)"
            >
              {admin ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-1 -mb-px">
            {visibleTabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                  tab === id
                    ? id === 'graph'
                      ? 'border-violet-400 text-violet-300'
                      : 'border-sherpa text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {tab === 'signals' && <SignalFeed />}
        {tab === 'sales-assist' && <SalesAssist />}
        {tab === 'territory' && <TerritoryPlan />}
        {tab === 'account-planning' && <AccountPlanning />}
        {tab === 'graph' && admin && <KnowledgeGraph />}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 pb-6 pt-2">
        <p className="text-center text-[11px] text-slate-600">
          Prepared by Max Aldinger for Qumulo &middot; May 2026
        </p>
      </footer>
    </div>
  )
}
