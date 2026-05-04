import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { ROLES, safeRole } from '@/lib/account-planning'
import { stripEmDashes } from '@/lib/strip-em'

export async function POST(req: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const body = await req.json()
    const { name, title, notes, account } = body

    if (!name || !title) {
      return NextResponse.json({ error: 'name and title are required' }, { status: 400 })
    }

    const systemPrompt = `You classify enterprise sales contacts into a fixed role taxonomy for stakeholder mapping. You are conservative: when the title is ambiguous, return "Unknown" rather than guessing.

Role taxonomy (use exactly one of these strings, case sensitive):
${ROLES.map(r => `- ${r}`).join('\n')}

Definitions:
- Economic Buyer: holds budget authority, signs the deal
- Champion: actively sells the deal internally on our behalf
- Technical Buyer: evaluates the technology fit, often architect/engineering lead
- Business User: end-user of the product
- Executive Sponsor: senior leader who endorses the initiative
- Financial Approver: finance role that gates the spend
- Legal Reviewer: legal/contracts role
- Security Reviewer: infosec/compliance role
- Influencer: shapes the decision but does not own it
- Blocker: actively opposes or stalls the deal
- Unknown: title gives insufficient signal

Return JSON only, no prose, no markdown fences:
{
  "role": "<one of the role strings exactly>",
  "confidence": <number between 0 and 1>,
  "reasoning": "<one short sentence, no em dashes>"
}`

    const userMessage = `Account: ${account || 'Unknown'}
Contact: ${name}
Title: ${title}
Notes: ${notes || '(none)'}`

    let response
    try {
      response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      })
    } catch (claudeErr: unknown) {
      const msg = claudeErr instanceof Error ? claudeErr.message : 'AI generation failed'
      console.error('[suggest-role] Claude error:', msg)
      return NextResponse.json({ error: 'AI generation failed: ' + msg }, { status: 502 })
    }

    const textBlock = response.content.find(b => b.type === 'text')
    const raw = textBlock && textBlock.type === 'text' ? textBlock.text : '{}'
    const cleaned = raw.replace(/```json|```/g, '').trim()

    let parsed: { role?: unknown; confidence?: unknown; reasoning?: unknown }
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ role: 'Unknown', confidence: 0, reasoning: 'AI output unparseable, defaulted to Unknown' })
    }

    const role = safeRole(parsed.role)
    const confidence =
      typeof parsed.confidence === 'number' && parsed.confidence >= 0 && parsed.confidence <= 1
        ? parsed.confidence
        : 0
    const reasoning = stripEmDashes(typeof parsed.reasoning === 'string' ? parsed.reasoning : '')

    return NextResponse.json({ role, confidence, reasoning })
  } catch (e: unknown) {
    console.error('[suggest-role] error:', e)
    const msg = e instanceof Error ? e.message : 'Failed to suggest role'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
