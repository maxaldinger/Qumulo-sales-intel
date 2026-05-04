import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { QUMULO_CONTEXT } from '@/lib/qumulo-context';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  try {
    const { contacts, dealName } = await request.json();

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: 'contacts array is required and must not be empty' }, { status: 400 });
    }

    const systemPrompt = `You are a multi-threading strategy expert for Qumulo enterprise sales deals. You analyze the stakeholder map of a deal and assess how well-threaded the account is. You identify gaps in stakeholder coverage and recommend strategies to expand engagement across the buying committee.

For Qumulo deals, the typical buying committee includes: VP/Director of Infrastructure, VP/Director of Storage, Head of Data Platform, Head of IT Infrastructure (technical buyers); CIO, CTO, occasionally CFO (economic buyers); storage architects, infrastructure engineers, data engineers, DevOps leads (technical evaluators); research/content/data-science teams (end users); cloud architects, security and compliance leaders (influencers).

Scoring rules:
- Calculate a score from 0-100 based on stakeholder coverage, seniority mix, department diversity, and engagement levels.
- Score labels: 0-25 = "Critical Risk", 26-50 = "Under-Threaded", 51-75 = "Moderately Threaded", 76-100 = "Well-Threaded"
- Score colors: 0-25 = "red", 26-50 = "orange", 51-75 = "yellow", 76-100 = "green"

${QUMULO_CONTEXT}

You MUST respond with valid JSON only, no markdown formatting, no explanation outside the JSON. Use this exact structure:
{
  "score": number (0-100),
  "score_label": "Critical Risk | Under-Threaded | Moderately Threaded | Well-Threaded",
  "score_color": "red | orange | yellow | green",
  "summary": "string (2-3 sentence summary of the threading assessment)",
  "contacts": [
    {
      "name": "string",
      "title": "string",
      "role": "string (Champion, Economic Buyer, Technical Evaluator, End User, Blocker, Coach, etc.)",
      "engagement": "High | Medium | Low | None",
      "influence": "High | Medium | Low",
      "sentiment": "Positive | Neutral | Negative | Unknown",
      "notes": "string (brief analysis of this contact's position and importance)"
    }
  ],
  "gaps": ["string array identifying missing roles or departments not yet engaged"],
  "recommendations": ["string array of 3-5 specific actionable recommendations to improve threading"]
}`;

    const contactsList = contacts
      .map((c: { name?: string; title?: string; role?: string; engagement?: string; notes?: string }) =>
        `- ${c.name || 'Unknown'}${c.title ? `, ${c.title}` : ''}${c.role ? ` (${c.role})` : ''}${c.engagement ? ` - Engagement: ${c.engagement}` : ''}${c.notes ? ` - Notes: ${c.notes}` : ''}`
      )
      .join('\n');

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Analyze the multi-threading status${dealName ? ` for the "${dealName}" deal` : ''} with these contacts:\n\n${contactsList}`,
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    const raw = textBlock ? textBlock.text : '{}';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    console.error('sa-threading error:', error);
    const errMsg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
