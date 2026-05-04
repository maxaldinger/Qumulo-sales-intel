import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { QUMULO_TENANT_ID, computeCoverageScore, type ContactWithRole, type ContactRole, type AccountPlan } from '@/lib/account-planning'

interface RouteCtx {
  params: { id: string }
}

export async function GET(_req: Request, { params }: RouteCtx) {
  try {
    const accountId = params.id
    if (!accountId) {
      return NextResponse.json({ error: 'account id required' }, { status: 400 })
    }

    const db = getDb()

    const [accountRes, contactsRes, rolesRes, planRes] = await Promise.all([
      db
        .from('q_territory_accounts')
        .select('id, company, vertical, revenue, state, city, incumbent, data_challenge, qumulo_fit, displacement_story, notes')
        .eq('id', accountId)
        .maybeSingle(),
      db
        .from('q_contacts')
        .select('*')
        .eq('tenant_id', QUMULO_TENANT_ID)
        .eq('account_id', accountId)
        .order('created_at', { ascending: true }),
      db
        .from('q_contact_roles')
        .select('*')
        .eq('tenant_id', QUMULO_TENANT_ID)
        .eq('account_id', accountId),
      db
        .from('q_account_plans')
        .select('*')
        .eq('tenant_id', QUMULO_TENANT_ID)
        .eq('account_id', accountId)
        .maybeSingle(),
    ])

    if (accountRes.error) throw accountRes.error
    if (!accountRes.data) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }
    if (contactsRes.error) throw contactsRes.error
    if (rolesRes.error) throw rolesRes.error
    if (planRes.error) throw planRes.error

    const contacts = contactsRes.data || []
    const roles = (rolesRes.data || []) as ContactRole[]

    const contactsWithRoles: ContactWithRole[] = contacts.map(c => ({
      ...c,
      role: roles.find(r => r.contact_id === c.id) || null,
    }))

    const plan: AccountPlan | null = planRes.data
      ? (planRes.data as AccountPlan)
      : null

    return NextResponse.json({
      account: accountRes.data,
      contacts: contactsWithRoles,
      plan,
      coverage_score: computeCoverageScore(roles),
    })
  } catch (e: unknown) {
    console.error('[account-planning/detail] error:', e)
    const msg = e instanceof Error ? e.message : 'Failed to load account'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
