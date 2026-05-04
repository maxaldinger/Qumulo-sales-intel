import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { QUMULO_TENANT_ID } from '@/lib/account-planning'
import { stripEmDashes } from '@/lib/strip-em'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { account_id, intel_brief } = body

    if (!account_id) {
      return NextResponse.json({ error: 'account_id required' }, { status: 400 })
    }

    const db = getDb()

    const cleaned = stripEmDashes(typeof intel_brief === 'string' ? intel_brief : '')

    const { error } = await db
      .from('q_account_plans')
      .upsert(
        {
          account_id,
          intel_brief: cleaned,
          tenant_id: QUMULO_TENANT_ID,
          last_updated: new Date().toISOString(),
        },
        { onConflict: 'account_id' }
      )

    if (error) throw error

    return NextResponse.json({ ok: true, intel_brief: cleaned })
  } catch (e: unknown) {
    console.error('[account-planning/intel] error:', e)
    const msg = e instanceof Error ? e.message : 'Failed to save intel'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
