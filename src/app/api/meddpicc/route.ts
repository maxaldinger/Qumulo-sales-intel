import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { QUMULO_CONTEXT } from '@/lib/qumulo-context'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const { notes, account } = await req.json()

  if (!notes?.trim()) {
    return NextResponse.json({ error: 'Notes are required' }, { status: 400 })
  }

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `You are an elite enterprise sales strategist specializing in MEDDPICC methodology, selling Qumulo, the unified global file system for unstructured data at exabyte scale.

${QUMULO_CONTEXT}

Account: ${account || 'Unknown'}

Below are raw call notes, meeting transcripts, or email threads from this deal. Analyze them and return a JSON object with this exact structure:

{
  "meddpicc": [
    { "letter": "M", "label": "Metrics", "status": "strong|weak|missing", "evidence": "What the notes reveal about quantifiable outcomes (or empty string if missing)", "gap": "What discovery is still needed (or empty string if strong)" },
    { "letter": "E", "label": "Economic Buyer", "status": "strong|weak|missing", "evidence": "...", "gap": "..." },
    { "letter": "D", "label": "Decision Criteria", "status": "strong|weak|missing", "evidence": "...", "gap": "..." },
    { "letter": "D", "label": "Decision Process", "status": "strong|weak|missing", "evidence": "...", "gap": "..." },
    { "letter": "P", "label": "Paper Process", "status": "strong|weak|missing", "evidence": "...", "gap": "..." },
    { "letter": "I", "label": "Identify Pain", "status": "strong|weak|missing", "evidence": "...", "gap": "..." },
    { "letter": "C", "label": "Champion", "status": "strong|weak|missing", "evidence": "...", "gap": "..." },
    { "letter": "C", "label": "Competition", "status": "strong|weak|missing", "evidence": "...", "gap": "..." }
  ],
  "lou": "A draft Letter of Understanding (2-3 paragraphs). Summarize what you heard: the customer's pain (incumbent storage cost, scale ceiling, cloud transition, multi-protocol need, etc.), what they need, what success looks like, and proposed next steps. Frame around Qumulo's value: cloud-native unstructured data platform, exabyte single namespace, NeuralCache, multi-protocol on one dataset. Write as if sending to the champion after the call.",
  "threading": [
    { "persona": "Title/Role to engage (e.g. VP Infrastructure, Storage Architect, CIO, Head of Data Platform)", "why": "Why this person matters to the deal", "approach": "Specific outreach suggestion" }
  ],
  "next_steps": ["Specific actionable step 1", "Step 2", "Step 3", "Step 4"]
}

Rules:
- "strong" = clear, specific evidence in the notes. "weak" = partially addressed or vague. "unknown" = not mentioned or discussed at all.
- CRITICAL: If a MEDDPICC dimension was NOT discussed or mentioned in the notes, set its status to "unknown" and leave evidence and gap as empty strings. Do NOT guess or fabricate evidence for topics that weren't covered. Only fill in fields where the notes provide real signal.
- Include 3-5 threading recommendations.
- Include 4-6 next steps, ordered by priority.
- Be specific to what's in the notes. Don't be generic.
- Frame everything through Qumulo's lens: cloud-native architecture, exabyte single namespace, decoupled compute and storage, multi-protocol, NeuralCache, Run Anywhere.
- For Competition, name likely incumbents (Isilon, NetApp, Pure FlashBlade) and modern alternatives (VAST, Weka, Nasuni, AWS FSx) when relevant.
- Return ONLY the JSON object.

Notes:
${notes}`
      }]
    })

    const raw = (msg.content[0] as any).text || ''
    let json = raw
    const fenceMatch = json.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenceMatch) json = fenceMatch[1]
    json = json.trim()
    if (!json.startsWith('{')) {
      const objStart = json.indexOf('{')
      if (objStart >= 0) json = json.slice(objStart)
    }

    const analysis = JSON.parse(json)
    return NextResponse.json({ analysis })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Analysis failed' }, { status: 500 })
  }
}
