import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { QUMULO_CONTEXT } from '@/lib/qumulo-context';

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('[proposal] Missing ANTHROPIC_API_KEY');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let body: any;
    try {
      body = await request.json();
    } catch (parseErr: any) {
      console.error('[proposal] Request body parse error:', parseErr.message);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { notes, products, dealName } = body;

    if (!notes) {
      return NextResponse.json({ error: 'notes is required' }, { status: 400 });
    }

    const systemPrompt = `You are an expert enterprise sales proposal writer for Qumulo. You create compelling, professional proposals that clearly articulate business value and drive deals to close. Frame everything around Qumulo's differentiators: cloud-native architecture, exabyte single namespace, multi-protocol on one dataset, decoupled compute and storage, predictable software-defined economics.

${QUMULO_CONTEXT}

Return ONLY valid JSON with no markdown fences, no backticks, no preamble. Use this exact structure:
{
  "title": "string (proposal title including prospect company name if available)",
  "date": "string (today's date formatted nicely)",
  "executive_summary": "string (2-3 paragraph executive summary of the proposal)",
  "business_challenges": [
    { "challenge": "string (challenge title)", "detail": "string (1-2 sentence explanation)" }
  ],
  "recommended_solution": "string (detailed description of the recommended Qumulo solution, referencing specific products and the displacement story vs. the incumbent if known)",
  "why_us": "string (compelling paragraph on why Qumulo is the best choice over Isilon, NetApp, FlashBlade, VAST, Weka, or hyperscaler alternatives)",
  "next_steps": [
    { "step": "string (step title)", "description": "string (owner and timeframe)" }
  ],
  "closing_statement": "string (1-2 paragraph compelling closing statement)"
}
Provide 3-5 business_challenges and 3-5 next_steps.`;

    const productsText = products && typeof products === 'string' && products.trim().length > 0
      ? `\n\nProducts to include in the proposal: ${products.trim()}`
      : '';

    console.log('[proposal] Calling Claude for deal:', dealName || '(unnamed)');

    let response;
    try {
      response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Generate a professional sales proposal${dealName ? ` for the "${dealName}" deal` : ''} based on these notes:\n\n${notes}${productsText}`,
          },
        ],
      });
    } catch (claudeErr: any) {
      console.error('[proposal] Claude API error:', claudeErr.message, claudeErr.status);
      return NextResponse.json({ error: 'AI generation failed: ' + (claudeErr.message || 'unknown error') }, { status: 502 });
    }

    const textBlock = response.content.find((block) => block.type === 'text');
    const raw = textBlock ? textBlock.text : '';
    console.log('[proposal] Claude response length:', raw.length, 'chars');

    if (!raw) {
      console.error('[proposal] Empty response from Claude');
      return NextResponse.json({ error: 'Empty response from AI' }, { status: 502 });
    }

    let json = raw;
    const fenceMatch = json.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) json = fenceMatch[1];
    json = json.trim();
    if (!json.startsWith('{')) {
      const objStart = json.indexOf('{');
      if (objStart >= 0) json = json.slice(objStart);
    }
    if (!json.endsWith('}')) {
      const lastBrace = json.lastIndexOf('}');
      if (lastBrace > 0) json = json.slice(0, lastBrace + 1);
    }

    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch (jsonErr: any) {
      console.error('[proposal] JSON parse error:', jsonErr.message, 'Raw (first 500):', raw.slice(0, 500));
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 502 });
    }

    console.log('[proposal] Success, title:', parsed.title || 'N/A');
    return NextResponse.json({ proposal: parsed });
  } catch (outerErr: any) {
    console.error('[proposal] Unhandled error:', outerErr.message, outerErr.stack);
    return NextResponse.json({ error: outerErr.message || 'Internal server error' }, { status: 500 });
  }
}
