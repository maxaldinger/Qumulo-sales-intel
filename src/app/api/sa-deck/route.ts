import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { QUMULO_CONTEXT } from '@/lib/qumulo-context'

/**
 * POST /api/sa-deck
 *
 * Body: { deckType: string, dealName?: string | null, notes?: string }
 *
 * Returns: { slides: Array<{ title, content, speaker_notes }> }
 *
 * Existed previously as a client-side prompt jammed into /api/sa-chat with
 * a 2000-token cap. That cap was clipping the JSON mid-string and producing
 * the parse error at byte 6962. This route owns the prompt, runs at 4096
 * tokens, and does all defensive parsing server-side so the component just
 * receives clean structured data or a clean error.
 *
 * Defenses applied (in order):
 *   1. Strip ``` fences (with or without `json` language tag, with or
 *      without trailing newline) before attempting to parse.
 *   2. Crop the text to the outermost [ ... ] in case Claude prepended a
 *      preamble or appended commentary despite instructions.
 *   3. JSON.parse inside a try/catch. On failure, log the FULL raw response
 *      to console.error and return a structured 502 to the client so the
 *      browser does not see a crash — only an error message.
 *   4. The system prompt is written without contractions / apostrophes in
 *      its own field-description text, so any stray apostrophe Claude sees
 *      came from the deal notes the rep pasted in, not from us.
 */

const DECK_LABELS: Record<string, string> = {
  prospect:    'Prospect Deck (first-meeting overview, value proposition)',
  discovery:   'Discovery Deck (qualifying questions, framework)',
  proposal:    'Proposal Deck (solution proposal, pricing, implementation plan)',
  qbr:         'QBR Deck (quarterly review, usage metrics, roadmap)',
  competitive: 'Competitive Deck (positioning, differentiation, win themes)',
}

export async function POST(req: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('[sa-deck] Missing ANTHROPIC_API_KEY')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    let body: { deckType?: string; dealName?: string | null; notes?: string }
    try {
      body = await req.json()
    } catch (parseErr: unknown) {
      const msg = parseErr instanceof Error ? parseErr.message : 'Invalid request body'
      console.error('[sa-deck] Body parse error:', msg)
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const deckType = typeof body.deckType === 'string' ? body.deckType.trim() : 'prospect'
    const dealName = typeof body.dealName === 'string' && body.dealName.trim() ? body.dealName.trim() : 'a prospect'
    const notes = typeof body.notes === 'string' ? body.notes.trim() : ''
    const deckLabel = DECK_LABELS[deckType] ?? `${deckType} deck`

    /* ── System prompt ──────────────────────────────────────────────
     * Hard rules at the top so Claude reads them before the schema. The
     * schema description below uses neutral wording (no apostrophes, no
     * contractions, no internal double quotes) so nothing in our prompt
     * can leak into the output as a stray quote that would break JSON. */
    const systemPrompt = `You are a sales-deck copywriter for a Qumulo seller. You produce structured slide content that the rep will paste into Google Slides or Keynote.

${QUMULO_CONTEXT}

OUTPUT RULES (strict, non-negotiable):
- Respond with valid JSON only. No markdown fences, no preamble, no trailing commas.
- All string values must have internal quotes escaped with backslash.
- Your entire response must be parseable by JSON.parse() with no transformation.
- The response must be a JSON array, starting with the character [ and ending with the character ].

SCHEMA (each element is one slide):
[
  {
    "title": "short title for the slide, plain text, no internal quotes if avoidable",
    "content": "slide body as bullet points separated by newlines, presentation-ready prose. Each bullet starts with a hyphen and a space.",
    "speaker_notes": "talking points the presenter reads aloud or glances at. 2 to 4 sentences."
  }
]

DECK SHAPE:
- Produce 8 to 12 slides total. Aim for 10.
- Open with a context slide. Close with a clear next-step slide.
- Lean on Qumulos differentiators (cloud-native architecture, exabyte single namespace, multi-protocol on one dataset, decoupled compute and storage, NeuralCache, Run Anywhere) wherever they fit the slide topic.
- For competitive slides, name real incumbents (Isilon, NetApp ONTAP, Pure FlashBlade, VAST, Weka).
- Do not fabricate customer names, contact names, or specific revenue figures.

Return ONLY the JSON array. No surrounding prose.`

    const userMessage = `Generate a ${deckLabel} for ${dealName}.

Context and notes from the rep:
${notes || '(none provided)'}`

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    let response
    try {
      response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      })
    } catch (claudeErr: unknown) {
      const msg = claudeErr instanceof Error ? claudeErr.message : 'AI generation failed'
      console.error('[sa-deck] Claude error:', msg)
      return NextResponse.json({ error: 'AI generation failed: ' + msg }, { status: 502 })
    }

    const textBlock = response.content.find(b => b.type === 'text')
    const raw = textBlock && textBlock.type === 'text' ? textBlock.text : ''

    if (!raw) {
      console.error('[sa-deck] Empty response from Claude')
      return NextResponse.json({ error: 'Empty response from AI' }, { status: 502 })
    }

    /* ── Defense 1: strip fences ─────────────────────────────────── */
    let clean = raw
      .replace(/```json\n?/g, '')
      .replace(/```/g, '')
      .trim()

    /* ── Defense 2: crop to outermost array ──────────────────────── */
    const arrStart = clean.indexOf('[')
    const arrEnd = clean.lastIndexOf(']')
    if (arrStart === -1 || arrEnd === -1 || arrEnd <= arrStart) {
      console.error('[sa-deck] No JSON array found. Raw response:', raw)
      return NextResponse.json({
        error: 'AI response did not contain a JSON array',
      }, { status: 502 })
    }
    clean = clean.slice(arrStart, arrEnd + 1)

    /* ── Defense 3: parse with full-raw logging on failure ────── */
    let parsed: unknown
    try {
      parsed = JSON.parse(clean)
    } catch (jsonErr: unknown) {
      const msg = jsonErr instanceof Error ? jsonErr.message : 'JSON parse error'
      // Full raw response so the operator can see exactly what Claude returned
      // when triaging recurring schema issues.
      console.error('[sa-deck] JSON parse failed:', msg)
      console.error('[sa-deck] Raw response (full):\n' + raw)
      return NextResponse.json({
        error: 'AI returned malformed JSON: ' + msg,
      }, { status: 502 })
    }

    if (!Array.isArray(parsed)) {
      console.error('[sa-deck] Parsed payload is not an array. Raw:', raw)
      return NextResponse.json({ error: 'AI did not return an array of slides' }, { status: 502 })
    }

    interface RawSlide { title?: unknown; content?: unknown; speaker_notes?: unknown }

    const slides = parsed.map((s: RawSlide) => ({
      title: typeof s.title === 'string' ? s.title : '',
      content: typeof s.content === 'string' ? s.content : '',
      speaker_notes: typeof s.speaker_notes === 'string' ? s.speaker_notes : '',
    }))

    console.log('[sa-deck] Success: returned', slides.length, 'slides for', deckType)
    return NextResponse.json({ slides })
  } catch (outerErr: unknown) {
    const msg = outerErr instanceof Error ? outerErr.message : 'Internal server error'
    console.error('[sa-deck] Unhandled error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
