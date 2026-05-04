import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { QUMULO_TENANT_ID, REQUIRED_ROLES, STRONG_STANCES, type AccountSummary } from '@/lib/account-planning'

export async function GET() {
  try {
    const db = getDb()

    const { data: rawAccounts, error: accErr } = await db
      .from('q_territory_accounts')
      .select('id, company, vertical, priority, created_at')

    if (accErr) throw accErr
    if (!rawAccounts || rawAccounts.length === 0) {
      return NextResponse.json({ accounts: [] as AccountSummary[] })
    }

    const accounts = [...rawAccounts].sort((a, b) => {
      const pa = a.priority ?? 0
      const pb = b.priority ?? 0
      if (pb !== pa) return pb - pa
      return (b.created_at ?? '').localeCompare(a.created_at ?? '')
    })

    const accountIds = accounts.map(a => a.id)

    // supabase-js quirk: chaining .eq() before .in() returns 0 rows. Put .in() first.
    const [contactsRes, rolesRes, plansRes] = await Promise.all([
      db
        .from('q_contacts')
        .select('id, account_id')
        .in('account_id', accountIds)
        .eq('tenant_id', QUMULO_TENANT_ID),
      db
        .from('q_contact_roles')
        .select('account_id, role, stance')
        .in('account_id', accountIds)
        .eq('tenant_id', QUMULO_TENANT_ID),
      db
        .from('q_account_plans')
        .select('account_id, coverage_score, last_updated')
        .in('account_id', accountIds)
        .eq('tenant_id', QUMULO_TENANT_ID),
    ])

    if (contactsRes.error) throw contactsRes.error
    if (rolesRes.error) throw rolesRes.error
    if (plansRes.error) throw plansRes.error

    const contacts = contactsRes.data || []
    const roles = rolesRes.data || []
    const plans = plansRes.data || []

    const summaries: AccountSummary[] = accounts.map(a => {
      const accContacts = contacts.filter(c => c.account_id === a.id)
      const accRoles = roles.filter(r => r.account_id === a.id)
      const plan = plans.find(p => p.account_id === a.id)

      const filled = REQUIRED_ROLES.filter(req =>
        accRoles.some(r => r.role === req && STRONG_STANCES.includes(r.stance))
      ).length
      const computedScore = Math.round((filled / REQUIRED_ROLES.length) * 100)

      return {
        id: a.id,
        name: a.company,
        vertical: a.vertical,
        contact_count: accContacts.length,
        coverage_score: plan?.coverage_score ?? computedScore,
        single_thread_risk: accContacts.length === 1,
        last_updated: plan?.last_updated ?? null,
      }
    })

    return NextResponse.json({ accounts: summaries })
  } catch (e: unknown) {
    console.error('[account-planning/accounts] error:', e)
    const msg = e instanceof Error ? e.message : 'Failed to load accounts'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
