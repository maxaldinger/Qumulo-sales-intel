import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getDb } from '@/lib/db'
import { QUMULO_TENANT_ID } from '@/lib/account-planning'
import { stripEmDashes } from '@/lib/strip-em'

export async function POST(req: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const body = await req.json()
    const { account_id, source_text, save } = body

    if (!account_id) {
      return NextResponse.json({ error: 'account_id required' }, { status: 400 })
    }

    const systemPrompt = `You are an enterprise sales strategist for Qumulo (cloud-native unstructured data platform, exabyte single namespace, multi-cloud). You produce concise, scannable account briefs from public information or rep notes. Format:

1. Two-sentence overview of the account.
2. Three to five bullets: unstructured data growth signals, current storage incumbent if visible (Isilon/NetApp/FlashBlade/legacy NAS), cloud posture, organizational structure, recent signals, competitive context, anything actionable for a Qumulo rep.
3. One closing line on the Qumulo displacement angle.

Hard rules:
- Never use em dashes or en dashes. Use commas, periods, or restructure.
- Be specific to the source text. If there is no signal, say so plainly. Do not invent.
- Plain text. No markdown headings. Use a blank line between sections.`

    const userMessage = source_text && source_text.trim()
      ? `Source:\n${source_text.trim()}`
      : `No source text provided. Produce a brief but flag that the rep should add notes for a sharper brief.`

    let response
    try {
      response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      })
    } catch (claudeErr: unknown) {
      const msg = claudeErr instanceof Error ? claudeErr.message : 'AI generation failed'
      console.error('[generate-brief] Claude error:', msg)
      return NextResponse.json({ error: 'AI generation failed: ' + msg }, { status: 502 })
    }

    const textBlock = response.content.find(b => b.type === 'text')
    const raw = textBlock && textBlock.type === 'text' ? textBlock.text : ''
    const brief = stripEmDashes(raw.trim())

    if (save) {
      const db = getDb()
      const { error } = await db
        .from('sg_account_plans')
        .upsert(
          {
            account_id,
            intel_brief: brief,
            tenant_id: QUMULO_TENANT_ID,
            last_updated: new Date().toISOString(),
          },
          { onConflict: 'account_id' }
        )
      if (error) {
        console.error('[generate-brief] save error:', error)
      }
    }

    return NextResponse.json({ brief })
  } catch (e: unknown) {
    console.error('[generate-brief] error:', e)
    const msg = e instanceof Error ? e.message : 'Failed to generate brief'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
