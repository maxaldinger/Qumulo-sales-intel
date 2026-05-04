import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { QUMULO_CONTEXT } from '@/lib/qumulo-context';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  try {
    const { transcript, dealName } = await request.json();

    if (!transcript) {
      return NextResponse.json({ error: 'transcript is required' }, { status: 400 });
    }

    const systemPrompt = `You are an expert at analyzing meeting transcripts and generating Letters of Understanding (LOUs) for Qumulo enterprise sales deals. Your job is to extract pain points, issues, and requirements from meeting transcripts and produce structured LOU content.

For each issue identified, categorize it into one of these categories: "Storage Architecture", "Cloud & Hybrid", "Performance / Workload", "Cost & Economics", "Operations & Tooling".

Assign a priority level: "High", "Medium", or "Low".

Reference Qumulo capabilities (Cloud Native, NeuralCache, Global Namespace, multi-protocol, software-defined economics) where they address the identified pain points.

${QUMULO_CONTEXT}

You MUST respond with valid JSON only, no markdown formatting, no explanation outside the JSON. Use this exact structure:
{
  "company": "string (the prospect company name extracted from transcript)",
  "meetingDate": "string (date extracted or today's date)",
  "attendees": ["string array of attendee names extracted from transcript"],
  "rows": [
    {
      "issue": "string (the pain point or issue identified)",
      "response": "string (proposed solution referencing Qumulo capabilities)",
      "category": "Storage Architecture | Cloud & Hybrid | Performance / Workload | Cost & Economics | Operations & Tooling",
      "priority": "High | Medium | Low",
      "timeframe": "string (estimated timeframe to address, e.g. 'Phase 1 - 30 days')"
    }
  ]
}`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Generate a Letter of Understanding from the following meeting transcript${dealName ? ` for the "${dealName}" deal` : ''}:\n\n${transcript}`,
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    const raw = textBlock ? textBlock.text : '{}';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    console.error('sa-lou error:', error);
    const errMsg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
