import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getDb, INTEL_TTL_HOURS } from '@/lib/db'
import { QUMULO_CONTEXT } from '@/lib/qumulo-context'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function scrapeWebsite(domain: string): Promise<string> {
  try {
    const url = domain.startsWith('http') ? domain : `https://${domain}`
    const r = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { 'User-Agent': 'Mozilla/5.0' } })
    let html = await r.text()
    html = html.replace(/<script[\s\S]*?<\/script>/gi, '')
    html = html.replace(/<style[\s\S]*?<\/style>/gi, '')
    html = html.replace(/<[^>]+>/g, ' ')
    html = html.replace(/\s+/g, ' ').trim()
    return html.slice(0, 4000)
  } catch {
    return ''
  }
}

async function fetchNews(company: string): Promise<string[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(company + ' storage data infrastructure cloud')}&hl=en-US&gl=US&ceid=US:en`
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) })
    const xml = await r.text()
    const titles: string[] = []
    const matches = xml.matchAll(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/g)
    for (const m of matches) {
      const t = m[1]?.trim()
      if (t && !t.includes('Google News') && t.length > 10) titles.push(t)
    }
    return titles.slice(0, 6)
  } catch {
    return []
  }
}

async function fetchContracts(company: string): Promise<string[]> {
  try {
    const url = `https://api.usaspending.gov/api/v2/search/spending_by_award/`
    const body = {
      filters: { keywords: [company], time_period: [{ start_date: '2023-01-01', end_date: '2026-12-31' }] },
      fields: ['Award ID', 'Recipient Name', 'Description', 'Award Amount'],
      limit: 4, page: 1, sort: 'Award Amount', order: 'desc', subawards: false,
    }
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(6000),
    })
    const d = await r.json()
    return (d.results || []).map((c: any) =>
      `${c['Recipient Name']}: ${c['Description']?.slice(0, 100)} ($${(c['Award Amount'] || 0).toLocaleString()})`
    )
  } catch {
    return []
  }
}

export async function POST(req: Request) {
  const { company, domain } = await req.json()
  if (!company) return NextResponse.json({ error: 'Company name required' }, { status: 400 })

  const db = getDb()

  // Check cache
  const { data: cached } = await db.from('sg_company_intel').select('*').eq('company', company).single()
  if (cached?.intel && cached.last_analyzed_at) {
    const age = (Date.now() - new Date(cached.last_analyzed_at).getTime()) / 3600000
    if (age < INTEL_TTL_HOURS) {
      return NextResponse.json({ intel: cached.intel, cached: true, analyzed_at: cached.last_analyzed_at })
    }
  }

  const inferredDomain = domain || `${company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
  const [websiteText, news, contracts] = await Promise.all([
    scrapeWebsite(inferredDomain),
    fetchNews(company),
    fetchContracts(company),
  ])

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2500,
      messages: [{
        role: 'user',
        content: `You are an enterprise account intelligence analyst for Qumulo, the unified global file system for unstructured data at exabyte scale, running natively in AWS, Azure, GCP, Oracle Cloud, and on customer hardware.

${QUMULO_CONTEXT}

Analyze this company for Qumulo sales targeting:

Company: ${company}
Website content: ${websiteText || 'Not available'}

Recent news:
${news.join('\n') || 'None found'}

Federal contracts:
${contracts.join('\n') || 'None found'}

Return ONLY a JSON object:
{
  "company_name": "${company}",
  "ticker": "TICKER or null",
  "hq": "City, State",
  "primary_vertical": "Media & Entertainment|Healthcare & Life Sciences|Research & HPC|Financial Services|Government & Public Safety|Geospatial & Mapping|Defense & Aerospace|Energy|Semiconductor",
  "relevance_score": 0-100,
  "relevance_label": "Prime Target|Strong Fit|Moderate Fit|Low Priority",
  "relevance_color": "green|yellow|orange|red",
  "snapshot": "3-4 sentence company overview focused on their unstructured data landscape, scale, and infrastructure posture",
  "qumulo_fit": "2-3 sentences on how Qumulo specifically solves their unstructured data challenges (single namespace, multi-protocol, cloud-native, NeuralCache, decoupled compute/storage)",
  "data_challenge": "2-3 sentences on their core unstructured data problems (incumbent NAS pain, cloud transition, scale ceiling, cost, multi-site)",
  "signals": [
    { "type": "news|funding|hiring|contract|partnership|earnings|research|regulation", "urgency": "high|medium|low", "text": "Signal description", "date": "YYYY-MM" }
  ],
  "target_contacts": [
    { "title": "Job Title (e.g. VP Infrastructure, Storage Architect, CIO)", "department": "Department", "why_target": "Why this person", "linkedin_search": "search query" }
  ],
  "outreach_angle": "2-3 sentence outreach hook framed against the likely incumbent (Isilon, NetApp, FlashBlade) or their cloud posture",
  "email_subject": "Under 8 words",
  "talking_points": ["point 1", "point 2", "point 3"],
  "competitor_risk": "VAST Data, Weka, Nasuni, Pure, NetApp, Dell, or hyperscaler-native — name the most likely vendors competing for this account",
  "risk_flags": ["flag1", "flag2"]
}

Scoring: green=80-100 (clear unstructured data growth + active signals + likely incumbent at refresh), yellow=60-79, orange=40-59, red=0-39.
Include 4-6 signals and 4 target contacts. Return ONLY the JSON object.`
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

    const intel = JSON.parse(json)

    // Write signals to timeline
    if (intel.signals) {
      for (const s of intel.signals) {
        await db.from('sg_signal_timeline').upsert(
          { company, signal_type: s.type, urgency: s.urgency, signal_text: s.text, signal_date: s.date },
          { onConflict: 'company,signal_text' }
        ).select()
      }
    }

    // Cache
    await db.from('sg_company_intel').upsert({
      company,
      vertical_id: intel.primary_vertical?.toLowerCase().replace(/[^a-z]/g, '').slice(0, 12),
      vertical_label: intel.primary_vertical,
      urgency: intel.relevance_score >= 80 ? 'high' : intel.relevance_score >= 60 ? 'medium' : 'low',
      top_signal: intel.signals?.[0]?.text || '',
      why_stardog: intel.qumulo_fit,
      intel,
      last_analyzed_at: new Date().toISOString(),
    }, { onConflict: 'company' }).select()

    return NextResponse.json({ intel, cached: false, analyzed_at: new Date().toISOString() })
  } catch (e: any) {
    if (cached?.intel) return NextResponse.json({ intel: cached.intel, cached: true, analyzed_at: cached.last_analyzed_at })
    return NextResponse.json({ error: e.message || 'Analysis failed' }, { status: 500 })
  }
}
