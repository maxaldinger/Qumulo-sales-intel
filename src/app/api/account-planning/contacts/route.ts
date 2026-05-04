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

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { account_id, name, title, notes, role, stance, influence } = body

    if (!account_id || !name?.trim()) {
      return NextResponse.json(
        { error: 'account_id and name are required' },
        { status: 400 }
      )
    }

    const db = getDb()

    const { data: contact, error: contactErr } = await db
      .from('q_contacts')
      .insert({
        account_id,
        name: name.trim(),
        title: (title || '').trim(),
        notes: (notes || '').trim(),
        tenant_id: QUMULO_TENANT_ID,
      })
      .select()
      .single()

    if (contactErr) throw contactErr

    const safeRoleVal = safeRole(role)
    const safeStanceVal: Stance = (STANCES as readonly string[]).includes(stance)
      ? (stance as Stance)
      : 'Unknown'
    const safeInfluence =
      typeof influence === 'number' && influence >= 1 && influence <= 5
        ? influence
        : 3

    const { error: roleErr } = await db
      .from('q_contact_roles')
      .insert({
        contact_id: contact.id,
        account_id,
        role: safeRoleVal,
        stance: safeStanceVal,
        influence: safeInfluence,
        tenant_id: QUMULO_TENANT_ID,
      })

    if (roleErr) throw roleErr

    await recalcCoverage(account_id)

    return NextResponse.json({ contact })
  } catch (e: unknown) {
    console.error('[account-planning/contacts POST] error:', e)
    const msg = e instanceof Error ? e.message : 'Failed to create contact'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const db = getDb()

    const { data: contact, error: lookupErr } = await db
      .from('q_contacts')
      .select('account_id')
      .eq('id', id)
      .eq('tenant_id', QUMULO_TENANT_ID)
      .maybeSingle()

    if (lookupErr) throw lookupErr
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const { error: delErr } = await db
      .from('q_contacts')
      .delete()
      .eq('id', id)
      .eq('tenant_id', QUMULO_TENANT_ID)

    if (delErr) throw delErr

    await recalcCoverage(contact.account_id)

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('[account-planning/contacts DELETE] error:', e)
    const msg = e instanceof Error ? e.message : 'Failed to delete contact'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

async function recalcCoverage(accountId: string) {
  const db = getDb()
  const { data: roles, error } = await db
    .from('q_contact_roles')
    .select('*')
    .eq('tenant_id', QUMULO_TENANT_ID)
    .eq('account_id', accountId)

  if (error) {
    console.error('[recalcCoverage] role fetch error:', error)
    return
  }

  const score = computeCoverageScore((roles || []) as ContactRole[])

  const { error: upsertErr } = await db
    .from('q_account_plans')
    .upsert(
      {
        account_id: accountId,
        coverage_score: score,
        tenant_id: QUMULO_TENANT_ID,
        last_updated: new Date().toISOString(),
      },
      { onConflict: 'account_id' }
    )

  if (upsertErr) {
    console.error('[recalcCoverage] upsert error:', upsertErr)
  }
}

export const dynamic = 'force-dynamic'
