export interface Company {
  company: string
  vertical_id: string
  vertical_label: string
  signal_count: number
  top_signal: string
  signal_type: string
  urgency: 'high' | 'medium' | 'low'
  amount: string | null
  date: string
  why_qumulo: string
}

export interface Signal {
  type: string
  urgency: string
  text: string
  date: string
}

export interface Contact {
  title: string
  department: string
  why_target: string
  linkedin_search: string
}

export interface Intel {
  company_name: string
  ticker: string | null
  hq: string
  primary_vertical: string
  relevance_score: number
  relevance_label: string
  relevance_color: string
  snapshot: string
  qumulo_fit: string
  data_challenge: string
  signals: Signal[]
  target_contacts: Contact[]
  outreach_angle: string
  email_subject: string
  talking_points: string[]
  competitor_risk: string
  risk_flags: string[]
}

export interface TimelineEntry {
  id: string
  company: string
  signal_type: string
  urgency: string
  signal_text: string
  signal_date: string
  first_seen_at: string
}

export const VERTICALS = [
  { id: 'media',         label: 'Media & Entertainment',     color: 'orange' },
  { id: 'lifesciences',  label: 'Healthcare & Life Sciences', color: 'emerald' },
  { id: 'research',      label: 'Research & HPC',             color: 'violet' },
  { id: 'finserv',       label: 'Financial Services',         color: 'blue' },
  { id: 'government',    label: 'Government & Public Safety', color: 'teal' },
  { id: 'geospatial',    label: 'Geospatial & Mapping',       color: 'cyan' },
  { id: 'defense',       label: 'Defense & Aerospace',        color: 'amber' },
  { id: 'energy',        label: 'Energy',                     color: 'yellow' },
  { id: 'semiconductor', label: 'Semiconductor',              color: 'pink' },
] as const

export const VERTICAL_COLORS: Record<string, string> = {
  media:         'bg-orange-500/20 text-orange-300 border-orange-500/30',
  lifesciences:  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  research:      'bg-violet-500/20 text-violet-300 border-violet-500/30',
  finserv:       'bg-blue-500/20 text-blue-300 border-blue-500/30',
  government:    'bg-teal-500/20 text-teal-300 border-teal-500/30',
  geospatial:    'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  defense:       'bg-amber-500/20 text-amber-300 border-amber-500/30',
  energy:        'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  semiconductor: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
}

export const URGENCY_COLORS: Record<string, string> = {
  high:   'bg-red-500/20 text-red-300',
  medium: 'bg-yellow-500/20 text-yellow-300',
  low:    'bg-slate-500/20 text-slate-300',
}

export const SIGNAL_ICONS: Record<string, string> = {
  news:        '\u{1F4F0}',
  funding:     '\u{1F4B0}',
  hiring:      '\u{1F465}',
  contract:    '\u{1F4CB}',
  partnership: '\u{1F91D}',
  earnings:    '\u{1F4CA}',
  research:    '\u{1F52C}',
  regulation:  '\u{2696}\u{FE0F}',
}

export const SCORE_COLORS: Record<string, string> = {
  green:  'text-emerald-400',
  yellow: 'text-yellow-400',
  orange: 'text-orange-400',
  red:    'text-red-400',
}
