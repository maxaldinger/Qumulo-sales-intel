import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import {
  QUMULO_TENANT_ID,
  computeCoverageScore,
  safeRole,
  STANCES,
  type ContactRole,
  type Stance,
} from '@/lib/account-planning'

/**
 * Update a contact's role / stance / influence. Recalculates coverage on every save.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { contact_id, account_id, role, stance, influence, last_touch, is_ai_suggested, ai_confidence } = body

    if (!contact_id || !account_id) {
      return NextResponse.json(
        { error: 'contact_id and account_id are required' },
        { status: 400 }
      )
    }

    const db = getDb()

    const safeRoleVal = safeRole(role)
    const safeStanceVal: Stance = (STANCES as readonly string[]).includes(stance)
      ? (stance as Stance)
      : 'Unknown'
    const safeInfluence =
      typeof influence === 'number' && influence >= 1 && influence <= 5
        ? influence
        : 3

    const update: Record<string, unknown> = {
      contact_id,
      account_id,
      role: safeRoleVal,
      stance: safeStanceVal,
      influence: safeInfluence,
      tenant_id: QUMULO_TENANT_ID,
      updated_at: new Date().toISOString(),
    }
    if (last_touch) update.last_touch = last_touch
    if (typeof is_ai_suggested === 'boolean') update.is_ai_suggested = is_ai_suggested
    if (typeof ai_confidence === 'number') update.ai_confidence = ai_confidence

    const { error: upsertErr } = await db
      .from('q_contact_roles')
      .upsert(update, { onConflict: 'contact_id' })

    if (upsertErr) throw upsertErr

    const { data: roles, error: fetchErr } = await db
      .from('q_contact_roles')
      .select('*')
      .eq('tenant_id', QUMULO_TENANT_ID)
      .eq('account_id', account_id)

    if (fetchErr) throw fetchErr

    const score = computeCoverageScore((roles || []) as ContactRole[])

    const { error: planErr } = await db
      .from('q_account_plans')
      .upsert(
        {
          account_id,
          coverage_score: score,
          tenant_id: QUMULO_TENANT_ID,
          last_updated: new Date().toISOString(),
        },
        { onConflict: 'account_id' }
      )

    if (planErr) throw planErr

    return NextResponse.json({ coverage_score: score })
  } catch (e: unknown) {
    console.error('[account-planning/role] error:', e)
    const msg = e instanceof Error ? e.message : 'Failed to update role'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
