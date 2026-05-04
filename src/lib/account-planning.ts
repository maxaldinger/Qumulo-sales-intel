/**
 * Account Planning shared types, taxonomy, and scoring.
 */

export const QUMULO_TENANT_ID = '00000000-0000-0000-0000-000000000001'

export const ROLES = [
  'Economic Buyer',
  'Champion',
  'Technical Buyer',
  'Business User',
  'Executive Sponsor',
  'Financial Approver',
  'Legal Reviewer',
  'Security Reviewer',
  'Influencer',
  'Blocker',
  'Unknown',
] as const

export type Role = typeof ROLES[number]

export const REQUIRED_ROLES: Role[] = [
  'Economic Buyer',
  'Champion',
  'Technical Buyer',
  'Executive Sponsor',
]

export const STANCES = [
  'Champion',
  'Supporter',
  'Neutral',
  'Skeptic',
  'Blocker',
  'Unknown',
] as const

export type Stance = typeof STANCES[number]

export const STRONG_STANCES: Stance[] = ['Champion', 'Supporter']
export const WEAK_STANCES: Stance[] = ['Neutral', 'Unknown']

export interface Contact {
  id: string
  account_id: string
  name: string
  title: string
  notes: string
  tenant_id: string
  created_at: string
}

export interface ContactRole {
  id: string
  contact_id: string
  account_id: string
  role: Role
  influence: number
  stance: Stance
  is_ai_suggested: boolean
  ai_confidence: number | null
  last_touch: string | null
  tenant_id: string
  created_at: string
  updated_at: string
}

export interface AccountPlan {
  account_id: string
  coverage_score: number
  intel_brief: string
  tenant_id: string
  last_updated: string
}

export interface ContactWithRole extends Contact {
  role: ContactRole | null
}

export interface AccountSummary {
  id: string
  name: string
  vertical: string | null
  contact_count: number
  coverage_score: number
  single_thread_risk: boolean
  last_updated: string | null
}

export type RoleCoverageStatus = 'covered' | 'weak' | 'missing'

export interface RoleCoverage {
  role: Role
  status: RoleCoverageStatus
  required: boolean
  contact_names: string[]
}

/**
 * Coverage score = % of REQUIRED roles that have at least one contact
 * with a strong stance (Supporter or Champion). Range 0-100.
 */
export function computeCoverageScore(roles: ContactRole[]): number {
  const filled = REQUIRED_ROLES.filter(req =>
    roles.some(r => r.role === req && STRONG_STANCES.includes(r.stance))
  ).length
  return Math.round((filled / REQUIRED_ROLES.length) * 100)
}

/**
 * Coverage breakdown for ALL 11 roles. Used by the scorecard panel.
 */
export function computeRoleCoverage(
  contacts: ContactWithRole[]
): RoleCoverage[] {
  return ROLES.map(role => {
    const matching = contacts.filter(c => c.role?.role === role)
    if (matching.length === 0) {
      return {
        role,
        status: 'missing',
        required: REQUIRED_ROLES.includes(role),
        contact_names: [],
      }
    }
    const hasStrong = matching.some(
      c => c.role && STRONG_STANCES.includes(c.role.stance)
    )
    return {
      role,
      status: hasStrong ? 'covered' : 'weak',
      required: REQUIRED_ROLES.includes(role),
      contact_names: matching.map(c => c.name),
    }
  })
}

/**
 * Single-thread risk: only one mapped contact at the account.
 * "Mapped" = has a contact_role row, not just a stub.
 */
export function isSingleThreadRisk(contacts: ContactWithRole[]): boolean {
  const mapped = contacts.filter(c => c.role !== null)
  return mapped.length === 1
}

/**
 * Validate an AI-suggested role string. If invalid, return 'Unknown'.
 * Spec: "Reject anything else silently and fall back to Unknown."
 */
export function safeRole(input: unknown): Role {
  if (typeof input !== 'string') return 'Unknown'
  return (ROLES as readonly string[]).includes(input)
    ? (input as Role)
    : 'Unknown'
}
