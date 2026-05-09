import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { QUMULO_CONTEXT } from '@/lib/qumulo-context'
import { resolveStateFilter, stateAbbrToName } from '@/lib/us-states'

/**
 * POST /api/territory/discover
 *
 * Body: { region: string }   // any US state name or abbr, or any city name
 *
 * Returns up to 8 enterprise accounts in `region` that fit Qumulo's ICP
 * (unstructured-data scale, multi-cloud or NAS-incumbent pressure). The
 * companies are real public organizations; the per-account `data_challenge`,
 * `qumulo_fit`, `entry_strategy`, `key_personas`, and `est_acv` fields are
 * AI-inferred hypotheses (the UI labels them as such).
 *
 * Used by the Territory Plan tab when the user searches a geography that
 * isn't covered by Max's hardcoded AZ/NM/UT/CO defaults.
 */
export async function POST(req: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const body = await req.json().catch(() => ({}))
    const rawRegion = typeof body.region === 'string' ? body.region.trim() : ''
    if (!rawRegion) {
      return NextResponse.json({ error: 'region is required' }, { status: 400 })
    }

    // Resolve to a canonical region label so the prompt is unambiguous. If the
    // input matches a US state, use the full state name; otherwise treat as a
    // city / metro and pass through as-is.
    const stateAbbr = resolveStateFilter(rawRegion)
    const region = stateAbbr ? stateAbbrToName(stateAbbr) : rawRegion
    const regionType: 'state' | 'city' = stateAbbr ? 'state' : 'city'

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const prompt = `${QUMULO_CONTEXT}

Identify up to 8 real, well-known enterprise organizations physically headquartered or with a major operational footprint in ${regionType === 'state' ? `the state of ${region}` : `${region} (city or metro area)`} that fit Qumulo's ICP (visible unstructured-data growth, complex storage estate, multi-cloud or cloud-curious posture, or a legacy NAS incumbent likely at refresh).

Prioritize organizations whose unstructured-data needs are public knowledge: media studios, healthcare/life-sciences research institutes, national labs, research universities, defense contractors, semiconductor fabs, energy/seismic operators, geospatial firms, video-evidence/public-safety agencies, financial services with retention demands.

Avoid:
- Generic technology companies whose primary product is software (unless they themselves operate massive unstructured pipelines)
- Companies with no realistic Qumulo wedge

For each, return ONLY a JSON array (no preamble, no fences) of objects with this exact shape:
[
  {
    "company": "string (real public name)",
    "vertical": "Healthcare & Life Sciences | Media & Entertainment | Research / National Labs | Research / Higher Ed | Defense & Aerospace | Semiconductor | Energy | Government & Public Safety | Geospatial & Mapping | Financial Services",
    "vertical_id": "lifesciences | media | research | defense | semiconductor | energy | government | geospatial | finserv",
    "revenue": "string (rough revenue band, e.g. '$5B annual' or 'private — ~$200M')",
    "hq_city": "string",
    "hq_state": "two-letter US state abbreviation",
    "lat": number (approximate latitude of the city, decimal),
    "lng": number (approximate longitude of the city, decimal),
    "data_challenge": "string (1-2 sentences, hypothesis: likely incumbent + the friction)",
    "qumulo_fit": "string (1-2 sentences, hypothesis: which Qumulo capability addresses it)",
    "entry_strategy": "string (1 sentence, hypothesis: how a rep should open)",
    "key_personas": ["string array of 3-4 likely role titles, no real names"],
    "est_acv": "string (rough range, hypothesis, e.g. '$300K - $700K')"
  }
]

Hard rules:
- Up to 8 entries, prefer 4-6 strong fits over filler.
- All companies must be real public organizations a sales rep could LinkedIn-search and verify.
- key_personas are role titles only — never invent named individuals.
- hq_city/hq_state must be plausible for the company (use their actual headquarters or a major site in the region).
- Return ONLY the JSON array. No markdown, no commentary.`

    let response
    try {
      response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3500,
        messages: [{ role: 'user', content: prompt }],
      })
    } catch (claudeErr: unknown) {
      const msg = claudeErr instanceof Error ? claudeErr.message : 'AI generation failed'
      console.error('[territory/discover] Claude error:', msg)
      return NextResponse.json({ error: 'AI discovery failed: ' + msg }, { status: 502 })
    }

    const textBlock = response.content.find(b => b.type === 'text')
    const raw = textBlock && textBlock.type === 'text' ? textBlock.text : ''

    let json = raw
    const fenceMatch = json.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenceMatch) json = fenceMatch[1]
    json = json.trim()
    if (!json.startsWith('[')) {
      const arrStart = json.indexOf('[')
      if (arrStart >= 0) json = json.slice(arrStart)
    }
    if (!json.endsWith(']')) {
      const lastBrace = json.lastIndexOf('}')
      if (lastBrace > 0) json = json.slice(0, lastBrace + 1) + ']'
    }

    let accounts: unknown[]
    try {
      accounts = JSON.parse(json)
    } catch (parseErr: unknown) {
      const msg = parseErr instanceof Error ? parseErr.message : 'parse error'
      console.error('[territory/discover] JSON parse failed:', msg, 'raw:', raw.slice(0, 400))
      return NextResponse.json({ error: 'AI returned malformed JSON' }, { status: 502 })
    }

    if (!Array.isArray(accounts)) {
      return NextResponse.json({ error: 'AI returned non-array result' }, { status: 502 })
    }

    return NextResponse.json({
      region,
      region_type: regionType,
      state_abbr: stateAbbr,
      accounts,
    })
  } catch (e: unknown) {
    console.error('[territory/discover] error:', e)
    const msg = e instanceof Error ? e.message : 'Discover failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
