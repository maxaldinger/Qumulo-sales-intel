import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { QUMULO_CONTEXT } from '@/lib/qumulo-context';

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('[product-fit] Missing ANTHROPIC_API_KEY');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let body: any;
    try {
      body = await request.json();
    } catch (parseErr: any) {
      console.error('[product-fit] Request body parse error:', parseErr.message);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { notes, dealName } = body;

    if (!notes) {
      return NextResponse.json({ error: 'notes is required' }, { status: 400 });
    }

    const systemPrompt = `You are a product-fit analysis expert for Qumulo enterprise sales. You evaluate deal notes and discovery information to assess fit across Qumulo-specific dimensions.

${QUMULO_CONTEXT}

Evaluate fit across these 6 Qumulo-specific categories:
1. Unstructured Data Scale - How large is the prospect's unstructured data footprint, and how fast is it growing?
2. Cloud Posture - Are they multi-cloud, cloud-curious, or all-on-prem? Does Qumulo's Run Anywhere story unlock value?
3. Workload Fit - Do their workloads (M&E, genomics, HPC, EDA, geospatial, video evidence, AI/ML) match Qumulo's strengths?
4. Incumbent Displacement - Is there a clear incumbent (Isilon, NetApp, FlashBlade, legacy NAS) at refresh time?
5. Multi-Protocol & Namespace Need - Do they need NFS+SMB+S3 on the same data, or a single global namespace across sites?
6. Economic Pressure - Are they paying a hardware premium, hitting cloud egress costs, or under CFO pressure to flip CAPEX to OPEX?

Also evaluate fit for each Qumulo product/offering:
1. Qumulo Cloud Native (AWS/Azure/GCP/Oracle)
2. Qumulo Core (on-prem, customer hardware or appliance)
3. NeuralCache (predictive caching for AI/ML, render, HPC)
4. Global Namespace (multi-site / multi-cloud unified filesystem)
5. Qumulo-as-a-Service (HPE GreenLake / Dell APEX)

Return ONLY valid JSON with no markdown fences, no backticks, no preamble. Use this exact structure:
{
  "results": {
    "overall_score": number (0-100),
    "overall_label": "Strong Fit | Moderate Fit | Weak Fit | Not a Fit",
    "overall_summary": "2-3 sentence summary",
    "products": [
      {
        "product": "category or product name",
        "score": number (0-100),
        "fit_label": "Strong | Moderate | Weak | Not a Fit",
        "reasoning": "1-2 sentence explanation",
        "evidence": ["evidence point 1", "evidence point 2"]
      }
    ],
    "discovery_gaps": [
      {
        "area": "Unstructured Data Scale | Cloud Posture | Workload Fit | Incumbent Displacement | Multi-Protocol & Namespace Need | Economic Pressure",
        "question": "specific question to ask",
        "why_important": "why this matters for the deal"
      }
    ],
    "red_flags": [
      {
        "flag": "flag name",
        "severity": "high | medium | low",
        "detail": "explanation"
      }
    ],
    "not_a_fit": [
      {
        "product": "product name",
        "reason": "why it's not a fit"
      }
    ]
  }
}`;

    console.log('[product-fit] Calling Claude for deal:', dealName || '(unnamed)');

    let response;
    try {
      response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Analyze the product fit${dealName ? ` for the "${dealName}" deal` : ''} based on these notes:\n\n${notes}`,
          },
        ],
      });
    } catch (claudeErr: any) {
      console.error('[product-fit] Claude API error:', claudeErr.message, claudeErr.status);
      return NextResponse.json({ error: 'AI analysis failed: ' + (claudeErr.message || 'unknown error') }, { status: 502 });
    }

    const textBlock = response.content.find((block) => block.type === 'text');
    const raw = textBlock ? textBlock.text : '';
    console.log('[product-fit] Claude response length:', raw.length, 'chars');

    if (!raw) {
      console.error('[product-fit] Empty response from Claude');
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
      console.error('[product-fit] JSON parse error:', jsonErr.message, 'Raw (first 500):', raw.slice(0, 500));
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 502 });
    }

    console.log('[product-fit] Success, overall_score:', parsed.results?.overall_score ?? parsed.overall_score ?? 'N/A');
    return NextResponse.json(parsed);
  } catch (outerErr: any) {
    console.error('[product-fit] Unhandled error:', outerErr.message, outerErr.stack);
    return NextResponse.json({ error: outerErr.message || 'Internal server error' }, { status: 500 });
  }
}
