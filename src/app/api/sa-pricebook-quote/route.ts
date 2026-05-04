import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { QUMULO_CONTEXT } from '@/lib/qumulo-context';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  try {
    const { lineItems, dealName, discountPct } = await request.json();

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json({ error: 'lineItems array is required and must not be empty' }, { status: 400 });
    }

    const systemPrompt = `You are an expert at generating professional quote summaries for Qumulo enterprise software deals. You analyze line items, pricing, and discounts to create clear, compelling quote summaries that help reps present pricing to prospects.

${QUMULO_CONTEXT}

You MUST respond with valid JSON only, no markdown formatting, no explanation outside the JSON. Use this exact structure:
{
  "summary": "string (2-3 paragraph professional summary of the quote including total value, key Qumulo capabilities being delivered, and value justification framed against incumbent cost)",
  "notes": ["string array of 3-5 important notes, caveats, or recommendations about the quote (e.g., capacity tier ramp, NeuralCache positioning, multi-cloud licensing, GreenLake/APEX OPEX option, renewal considerations)"]
}`;

    const lineItemsList = lineItems
      .map((item: { product?: string; quantity?: number; unitPrice?: number; total?: number; description?: string }) =>
        `- ${item.product || 'Unknown Product'}${item.quantity ? ` x${item.quantity}` : ''}${item.unitPrice ? ` @ $${item.unitPrice.toLocaleString()}` : ''}${item.total ? ` = $${item.total.toLocaleString()}` : ''}${item.description ? ` (${item.description})` : ''}`
      )
      .join('\n');

    const discountText = discountPct ? `\n\nDiscount applied: ${discountPct}%` : '';

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Generate a professional quote summary${dealName ? ` for the "${dealName}" deal` : ''} with these line items:\n\n${lineItemsList}${discountText}`,
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    const raw = textBlock ? textBlock.text : '{}';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    console.error('sa-pricebook-quote error:', error);
    const errMsg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
