import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { QUMULO_TENANT_ID, REQUIRED_ROLES, STRONG_STANCES, type AccountSummary } from '@/lib/account-planning'

/**
 * GET — list every account in the plan with rolled-up coverage stats.
 */
export async function GET() {
  try {
    const db = getDb()

    const { data: rawAccounts, error: accErr } = await db
      .from('sg_territory_accounts')
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
        .from('sg_contacts')
        .select('id, account_id')
        .in('account_id', accountIds)
        .eq('tenant_id', QUMULO_TENANT_ID),
      db
        .from('sg_contact_roles')
        .select('account_id, role, stance')
        .in('account_id', accountIds)
        .eq('tenant_id', QUMULO_TENANT_ID),
      db
        .from('sg_account_plans')
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

/**
 * POST — add a Territory Plan account to the user's plan.
 *
 * Idempotent on company name: if an account with the same `company` already
 * exists in sg_territory_accounts, this returns the existing row instead of
 * creating a duplicate. Lets the Territory Plan tab safely send "Add to Plan"
 * clicks without checking first.
 *
 * Body: { company: string, vertical?: string, revenue?: string,
 *         data_challenge?: string, qumulo_fit?: string,
 *         entry_strategy?: string, key_personas?: string[],
 *         est_acv?: string, priority?: number }
 *
 * Note: the DB column for the displacement narrative is named `stardog_fit`
 * (legacy from StarIntel — see HANDOFF section 2). The UI uses `qumulo_fit`
 * everywhere; we map at the boundary.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const company = typeof body.company === 'string' ? body.company.trim() : ''
    if (!company) {
      return NextResponse.json({ error: 'company is required' }, { status: 400 })
    }

    const db = getDb()

    // Idempotency: dedupe on company name.
    const { data: existing, error: lookupErr } = await db
      .from('sg_territory_accounts')
      .select('id, company, vertical, created_at')
      .eq('company', company)
      .maybeSingle()

    if (lookupErr) throw lookupErr
    if (existing) {
      return NextResponse.json({ account: existing, created: false })
    }

    const insertRow: Record<string, unknown> = {
      company,
      vertical: typeof body.vertical === 'string' ? body.vertical : null,
      revenue: typeof body.revenue === 'string' ? body.revenue : null,
      data_challenge: typeof body.data_challenge === 'string' ? body.data_challenge : null,
      // legacy column name on the live DB
      stardog_fit: typeof body.qumulo_fit === 'string' ? body.qumulo_fit : null,
      entry_strategy: typeof body.entry_strategy === 'string' ? body.entry_strategy : null,
      key_personas: Array.isArray(body.key_personas)
        ? body.key_personas.join(', ')
        : (typeof body.key_personas === 'string' ? body.key_personas : null),
      est_acv: typeof body.est_acv === 'string' ? body.est_acv : null,
      priority: typeof body.priority === 'number' ? body.priority : 0,
      notes: typeof body.notes === 'string' ? body.notes : '',
    }

    const { data: inserted, error: insertErr } = await db
      .from('sg_territory_accounts')
      .insert(insertRow)
      .select('id, company, vertical, created_at')
      .single()

    if (insertErr) throw insertErr

    return NextResponse.json({ account: inserted, created: true })
  } catch (e: unknown) {
    console.error('[account-planning/accounts POST] error:', e)
    const msg = e instanceof Error ? e.message : 'Failed to add account'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * DELETE ?id=<uuid> — remove an account from the plan. Cascades to
 * sg_contacts / sg_contact_roles / sg_account_plans via FK ON DELETE CASCADE.
 *
 * Used to clean up the Stardog-era leftover accounts (Bloomberg, Eli Lilly,
 * First Citizens Bank) that are still in the shared Supabase project.
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const db = getDb()
    const { error: delErr } = await db
      .from('sg_territory_accounts')
      .delete()
      .eq('id', id)

    if (delErr) throw delErr
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('[account-planning/accounts DELETE] error:', e)
    const msg = e instanceof Error ? e.message : 'Failed to delete account'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
