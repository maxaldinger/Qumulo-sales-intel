'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, AlertTriangle, ChevronRight, RefreshCw, Trash2 } from 'lucide-react'
import type { AccountSummary } from '@/lib/account-planning'
import AccountDetail from './account-planning-detail'

export default function AccountPlanning() {
  const [accounts, setAccounts] = useState<AccountSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})

  const loadAccounts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/account-planning/accounts')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load accounts')
      setAccounts(data.accounts || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }, [])

  /** Hard-delete an account from the plan. Cascades to contacts/roles/plan
   *  row via FK. Used to clear out leftover Stardog-era seed accounts. */
  const removeAccount = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from the plan? This deletes any mapped contacts and the intel brief. This cannot be undone.`)) return
    setDeleting(p => ({ ...p, [id]: true }))
    try {
      const res = await fetch(`/api/account-planning/accounts?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Delete failed')
      }
      setAccounts(prev => prev.filter(a => a.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeleting(p => { const n = { ...p }; delete n[id]; return n })
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  if (selectedId) {
    return (
      <AccountDetail
        accountId={selectedId}
        onBack={() => {
          setSelectedId(null)
          loadAccounts()
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Account Planning</h2>
          <p className="text-sm text-slate-400">
            Map stakeholders, score role coverage, and brief your accounts.
          </p>
        </div>
        <button
          onClick={loadAccounts}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10 text-xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading && accounts.length === 0 && (
        <div className="p-12 rounded-xl bg-white/[0.03] border border-white/10 text-center text-slate-500 text-sm">
          Loading accounts...
        </div>
      )}

      {!loading && accounts.length === 0 && !error && (
        <div className="p-12 rounded-xl bg-white/[0.03] border border-white/10 text-center text-slate-400 text-sm">
          No accounts yet. Use <span className="text-cyan-300">Add to Plan</span> in the Territory Plan tab to populate this view.
        </div>
      )}

      {accounts.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-4 py-3 text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/5 bg-white/[0.02]">
            <div className="col-span-4">Account</div>
            <div className="col-span-2">Vertical</div>
            <div className="col-span-1 text-center">Contacts</div>
            <div className="col-span-2">Coverage</div>
            <div className="col-span-2">Risk</div>
            <div className="col-span-1 text-right">&nbsp;</div>
          </div>
          {accounts.map(a => (
            <div
              key={a.id}
              className="grid grid-cols-12 gap-4 items-center px-4 py-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
            >
              {/* Identity column — clickable to open detail */}
              <button
                type="button"
                onClick={() => setSelectedId(a.id)}
                className="col-span-4 flex items-center gap-2 text-left"
              >
                <Users className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                <span className="text-sm font-medium text-white">{a.name}</span>
              </button>
              <div className="col-span-2 text-xs text-slate-400">
                {a.vertical || 'Not yet mapped'}
              </div>
              <div className="col-span-1 text-center text-sm text-slate-300">
                {a.contact_count}
              </div>
              <div className="col-span-2">
                <CoverageBar score={a.coverage_score} />
              </div>
              <div className="col-span-2">
                {a.single_thread_risk ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-300 border border-red-500/20">
                    <AlertTriangle className="w-3 h-3" />
                    Single thread
                  </span>
                ) : a.contact_count === 0 ? (
                  <span className="text-[10px] text-slate-500">Not yet mapped</span>
                ) : (
                  <span className="text-[10px] text-emerald-400">OK</span>
                )}
              </div>
              <div className="col-span-1 flex items-center justify-end gap-1.5">
                <span className="text-[10px] text-slate-500">
                  {a.last_updated ? formatDate(a.last_updated) : 'Never'}
                </span>
                <button
                  type="button"
                  onClick={() => removeAccount(a.id, a.name)}
                  disabled={!!deleting[a.id]}
                  title="Remove this account from the plan"
                  className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedId(a.id)}
                  className="p-1 rounded text-slate-600 hover:text-slate-300 transition-colors"
                  title="Open account"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CoverageBar({ score }: { score: number }) {
  const color =
    score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-yellow-500' : score >= 25 ? 'bg-orange-500' : 'bg-red-500'
  const text =
    score >= 75 ? 'text-emerald-400' : score >= 50 ? 'text-yellow-400' : score >= 25 ? 'text-orange-400' : 'text-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-medium ${text} tabular-nums`}>{score}%</span>
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    const now = Date.now()
    const diffMs = now - d.getTime()
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  } catch {
    return ''
  }
}
