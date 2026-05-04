import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const company = searchParams.get('company')
  if (!company) return NextResponse.json({ error: 'Company required' }, { status: 400 })

  const db = getDb()
  const { data, error } = await db
    .from('sg_signal_timeline')
    .select('*')
    .eq('company', company)
    .order('first_seen_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ timeline: data || [] })
}
