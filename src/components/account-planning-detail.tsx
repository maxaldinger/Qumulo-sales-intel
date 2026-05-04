'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Save,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import {
  ROLES,
  STANCES,
  REQUIRED_ROLES,
  computeRoleCoverage,
  isSingleThreadRisk,
  type ContactWithRole,
  type AccountPlan,
  type Role,
  type Stance,
  type RoleCoverage,
} from '@/lib/account-planning'
import { stripEmDashes } from '@/lib/strip-em'

interface AccountInfo {
  id: string
  company: string
  vertical: string | null
  revenue: string | null
  state: string | null
  city: string | null
  incumbent: string | null
  data_challenge: string | null
  qumulo_fit: string | null
  displacement_story: string | null
  notes: string | null
}

interface DetailResponse {
  account: AccountInfo
  contacts: ContactWithRole[]
  plan: AccountPlan | null
  coverage_score: number
}

interface Props {
  accountId: string
  onBack: () => void
}

export default function AccountDetail({ accountId, onBack }: Props) {
  const [data, setData] = useState<DetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/account-planning/detail/${accountId}`)
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Failed to load account')
      setData(body as DetailResponse)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load account')
    } finally {
      setLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    load()
  }, [load])

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <BackButton onBack={onBack} />
        <div className="p-12 rounded-xl bg-white/[0.03] border border-white/10 text-center text-slate-500 text-sm">
          Loading account...
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <BackButton onBack={onBack} />
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          {error || 'Account not found'}
        </div>
      </div>
    )
  }

  const { account, contacts, plan, coverage_score } = data
  const coverage = computeRoleCoverage(contacts)
  const singleThread = isSingleThreadRisk(contacts)

  return (
    <div className="space-y-6">
      <BackButton onBack={onBack} />

      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">{account.company}</h2>
          <p className="text-sm text-slate-400">
            {account.vertical || 'Vertical not yet mapped'}
            {' \u00B7 '}
            {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'} mapped
          </p>
        </div>
        {singleThread && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-500/10 text-red-300 border border-red-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            Single thread risk
          </span>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7">
          <StakeholderMap
            accountId={accountId}
            accountName={account.company}
            contacts={contacts}
            onChange={load}
          />
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-6">
          <CoverageScorecard score={coverage_score} coverage={coverage} />
          <AccountIntel
            accountId={accountId}
            plan={plan}
            onSaved={load}
          />
        </div>
      </div>
    </div>
  )
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      Back to accounts
    </button>
  )
}

/* ─── Stakeholder Map ────────────────────────────────────────────── */

function StakeholderMap({
  accountId,
  accountName,
  contacts,
  onChange,
}: {
  accountId: string
  accountName: string
  contacts: ContactWithRole[]
  onChange: () => void
}) {
  const [adding, setAdding] = useState(false)

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Stakeholder Map</h3>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sherpa text-white text-xs hover:bg-[#005068] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Contact
        </button>
      </div>

      {adding && (
        <AddContactForm
          accountId={accountId}
          onCancel={() => setAdding(false)}
          onAdded={() => {
            setAdding(false)
            onChange()
          }}
        />
      )}

      {contacts.length === 0 && !adding && (
        <div className="p-8 text-center text-sm text-slate-500 border border-dashed border-white/10 rounded-lg">
          No contacts yet. Click Add Contact to start mapping stakeholders.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {contacts.map(c => (
          <ContactCard
            key={c.id}
            contact={c}
            accountId={accountId}
            accountName={accountName}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  )
}

function AddContactForm({
  accountId,
  onCancel,
  onAdded,
}: {
  accountId: string
  onCancel: () => void
  onAdded: () => void
}) {
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    if (!name.trim()) return
    setSaving(true)
    setErr('')
    try {
      const res = await fetch('/api/account-planning/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          name: name.trim(),
          title: title.trim(),
          notes: notes.trim(),
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Failed to add contact')
      onAdded()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to add contact')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 rounded-lg bg-white/[0.04] border border-white/10 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Name"
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 text-sm"
        />
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Title"
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 text-sm"
        />
      </div>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        rows={2}
        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 text-sm resize-none"
      />
      {err && <div className="text-xs text-red-400">{err}</div>}
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={saving || !name.trim()}
          className="px-3 py-1.5 rounded-lg bg-sherpa text-white text-xs hover:bg-[#005068] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Contact'}
        </button>
      </div>
    </div>
  )
}

function ContactCard({
  contact,
  accountId,
  accountName,
  onChange,
}: {
  contact: ContactWithRole
  accountId: string
  accountName: string
  onChange: () => void
}) {
  const initial = contact.role
  const [role, setRole] = useState<Role>(initial?.role ?? 'Unknown')
  const [stance, setStance] = useState<Stance>(initial?.stance ?? 'Unknown')
  const [influence, setInfluence] = useState(initial?.influence ?? 3)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [showAi, setShowAi] = useState(initial?.is_ai_suggested ?? false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiNote, setAiNote] = useState('')

  const onChangeField = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v)
    setDirty(true)
    setShowAi(false)
  }

  const suggestRole = async () => {
    setAiLoading(true)
    setAiNote('')
    try {
      const res = await fetch('/api/account-planning/suggest-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contact.name,
          title: contact.title,
          notes: contact.notes,
          account: accountName,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Failed to suggest role')

      const suggested = body.role as Role
      const conf = typeof body.confidence === 'number' ? body.confidence : 0
      setRole(suggested)
      setShowAi(true)
      setAiNote(`AI confidence ${(conf * 100).toFixed(0)}%. ${body.reasoning || ''}`)

      const persistRes = await fetch('/api/account-planning/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: contact.id,
          account_id: accountId,
          role: suggested,
          stance,
          influence,
          is_ai_suggested: true,
          ai_confidence: conf,
        }),
      })
      if (!persistRes.ok) {
        const b = await persistRes.json()
        throw new Error(b.error || 'Failed to persist suggestion')
      }
      setDirty(false)
      onChange()
    } catch (e) {
      setAiNote(e instanceof Error ? e.message : 'AI suggestion failed')
    } finally {
      setAiLoading(false)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/account-planning/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: contact.id,
          account_id: accountId,
          role,
          stance,
          influence,
          last_touch: new Date().toISOString(),
          is_ai_suggested: false,
        }),
      })
      if (!res.ok) {
        const b = await res.json()
        throw new Error(b.error || 'Failed to save')
      }
      setDirty(false)
      onChange()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!confirm(`Remove ${contact.name} from this account?`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/account-planning/contacts?id=${contact.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const b = await res.json()
        throw new Error(b.error || 'Failed to delete')
      }
      onChange()
    } catch (e) {
      console.error(e)
      setDeleting(false)
    }
  }

  return (
    <div className="p-4 rounded-lg bg-white/[0.04] border border-white/10 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-white truncate">{contact.name}</div>
          <div className="text-xs text-slate-400 truncate">
            {contact.title || 'Title not yet mapped'}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {showAi && (
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-violet-500/10 text-violet-300 border border-violet-500/20"
              title="Role suggested by AI"
            >
              AI suggested
            </span>
          )}
          <button
            onClick={remove}
            disabled={deleting}
            className="p-1 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
            title="Remove contact"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Role">
          <select
            value={role}
            onChange={e => onChangeField(setRole)(e.target.value as Role)}
            className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500/50"
          >
            {ROLES.map(r => (
              <option key={r} value={r} className="bg-slate-800">
                {r}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Stance">
          <select
            value={stance}
            onChange={e => onChangeField(setStance)(e.target.value as Stance)}
            className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500/50"
          >
            {STANCES.map(s => (
              <option key={s} value={s} className="bg-slate-800">
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label={`Influence: ${influence}/5`}>
        <input
          type="range"
          min={1}
          max={5}
          value={influence}
          onChange={e => onChangeField(setInfluence)(Number(e.target.value))}
          className="w-full accent-cyan-500"
        />
      </Field>

      {contact.notes && (
        <p className="text-xs text-slate-400 italic line-clamp-2">{contact.notes}</p>
      )}

      <div className="flex items-center justify-between pt-1 gap-2">
        <span className="text-[10px] text-slate-500 truncate">
          {initial?.last_touch
            ? `Last touch ${new Date(initial.last_touch).toLocaleDateString()}`
            : 'No touches logged'}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={suggestRole}
            disabled={aiLoading || saving}
            className="flex items-center gap-1 px-2 py-1 rounded bg-violet-500/10 border border-violet-500/30 text-violet-300 text-[10px] hover:bg-violet-500/20 transition-colors disabled:opacity-50"
            title="Ask Claude to suggest a role from the title and notes"
          >
            <Sparkles className="w-3 h-3" />
            {aiLoading ? 'Thinking...' : 'AI suggest role'}
          </button>
          {dirty && (
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {aiNote && (
        <p className="text-[10px] text-violet-300/80 leading-relaxed">{aiNote}</p>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </span>
      {children}
    </label>
  )
}

/* ─── Coverage Scorecard ─────────────────────────────────────────── */

function CoverageScorecard({
  score,
  coverage,
}: {
  score: number
  coverage: RoleCoverage[]
}) {
  const color =
    score >= 75 ? 'text-emerald-400' : score >= 50 ? 'text-yellow-400' : score >= 25 ? 'text-orange-400' : 'text-red-400'
  const stroke =
    score >= 75 ? '#10b981' : score >= 50 ? '#eab308' : score >= 25 ? '#f97316' : '#ef4444'
  const r = 36
  const c = 2 * Math.PI * r
  const offset = c - (score / 100) * c

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5 space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            <circle
              cx="48"
              cy="48"
              r={r}
              fill="none"
              stroke={stroke}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              transform="rotate(-90 48 48)"
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xl font-bold ${color}`}>{score}%</span>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Coverage Scorecard</h3>
          <p className="text-xs text-slate-400 mt-1">
            {REQUIRED_ROLES.length} required roles. Score reflects how many are filled with a Supporter or Champion stance.
          </p>
        </div>
      </div>

      <div className="space-y-1.5 pt-2">
        {coverage.map(c => (
          <CoverageRow key={c.role} item={c} />
        ))}
      </div>
    </div>
  )
}

function CoverageRow({ item }: { item: RoleCoverage }) {
  const Icon =
    item.status === 'covered' ? CheckCircle : item.status === 'weak' ? AlertCircle : XCircle
  const iconColor =
    item.status === 'covered'
      ? 'text-emerald-400'
      : item.status === 'weak'
        ? 'text-yellow-400'
        : item.required
          ? 'text-red-400'
          : 'text-slate-600'
  const labelColor = item.required ? 'text-slate-200' : 'text-slate-400'

  return (
    <div className="flex items-center gap-2 py-1">
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${iconColor}`} />
      <span className={`text-xs ${labelColor} flex-1`}>
        {item.role}
        {item.required && <span className="ml-1 text-[10px] text-slate-600">required</span>}
      </span>
      {item.contact_names.length > 0 && (
        <span className="text-[10px] text-slate-500 truncate max-w-[40%]">
          {item.contact_names.join(', ')}
        </span>
      )}
    </div>
  )
}

/* ─── Account Intel ──────────────────────────────────────────────── */

function AccountIntel({
  accountId,
  plan,
  onSaved,
}: {
  accountId: string
  plan: AccountPlan | null
  onSaved: () => void
}) {
  const [text, setText] = useState(plan?.intel_brief ?? '')
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    setText(plan?.intel_brief ?? '')
  }, [plan?.intel_brief])

  const save = async () => {
    setSaving(true)
    setErr('')
    try {
      const cleaned = stripEmDashes(text)
      const res = await fetch('/api/account-planning/intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId, intel_brief: cleaned }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Failed to save')
      setText(body.intel_brief ?? cleaned)
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const generateBrief = async () => {
    setGenerating(true)
    setErr('')
    try {
      const res = await fetch('/api/account-planning/generate-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId, source_text: text, save: true }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Failed to generate')
      setText(body.brief || '')
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to generate')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Account Intel</h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={generateBrief}
            disabled={generating || saving}
            className="flex items-center gap-1 px-2 py-1 rounded bg-violet-500/10 border border-violet-500/30 text-violet-300 text-[10px] hover:bg-violet-500/20 transition-colors disabled:opacity-50"
            title="Have Claude rewrite the field as a structured brief"
          >
            <Sparkles className="w-3 h-3" />
            {generating ? 'Generating...' : 'Generate brief'}
          </button>
          <button
            onClick={save}
            disabled={saving || generating}
            className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
          >
            <Save className="w-3 h-3" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Paste public info, notes, or strategic context for this account..."
        rows={10}
        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 text-sm resize-none leading-relaxed"
      />
      {err && <div className="text-xs text-red-400">{err}</div>}
      {plan?.last_updated && (
        <p className="text-[10px] text-slate-500">
          Last saved {new Date(plan.last_updated).toLocaleString()}
        </p>
      )}
    </div>
  )
}
