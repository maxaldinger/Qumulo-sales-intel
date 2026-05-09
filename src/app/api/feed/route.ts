import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getDb, FEED_TTL_HOURS } from '@/lib/db'
import { QUMULO_CONTEXT } from '@/lib/qumulo-context'

/* ──────────────────────────────────────────────────────────────────
 * Signal sources
 *
 * Free public sources only. Each fetcher must:
 *   1. Catch every error and return [] — never throw out of the function.
 *   2. Use AbortSignal.timeout so a slow source does not block the whole feed.
 *   3. Tag every produced signal with `signal_type` so the UI can render the
 *      right badge (nih_grant, sam_contract, nsf_award, sec_filing,
 *      hpcwire_news, fierce_healthcare).
 * ────────────────────────────────────────────────────────────────── */

const VERTICALS = [
  { id: 'media',         label: 'Media & Entertainment',     queries: ['animation studio storage cloud render farm', 'broadcast post production unstructured data', 'visual effects studio data infrastructure scale'] },
  { id: 'lifesciences',  label: 'Healthcare & Life Sciences', queries: ['genomics sequencing storage petabyte', 'medical imaging PACS storage cloud', 'clinical research data infrastructure life sciences'] },
  { id: 'research',      label: 'Research & HPC',             queries: ['national lab HPC storage scratch parallel filesystem', 'university research computing storage scale', 'supercomputing data infrastructure scientific'] },
  { id: 'finserv',       label: 'Financial Services',         queries: ['financial services unstructured data retention archive', 'bank long term data retention compliance storage', 'risk analytics data warehouse infrastructure'] },
  { id: 'government',    label: 'Government & Public Safety', queries: ['real time crime center video evidence storage', 'public safety body camera video retention storage', 'state government video surveillance data platform'] },
  { id: 'geospatial',    label: 'Geospatial & Mapping',       queries: ['geospatial mapping LIDAR satellite imagery storage', 'GIS data infrastructure petabyte cloud', 'mapping company unstructured data scale'] },
  { id: 'defense',       label: 'Defense & Aerospace',        queries: ['defense contractor simulation CAD storage scale', 'aerospace engineering data infrastructure cloud', 'mission data classified storage hybrid cloud'] },
  { id: 'energy',        label: 'Energy',                     queries: ['oil gas seismic data storage cloud HPC', 'energy company subsurface data infrastructure', 'utility geospatial data platform unstructured'] },
  { id: 'semiconductor', label: 'Semiconductor',              queries: ['semiconductor EDA verification storage cloud', 'fab data infrastructure petabyte unstructured', 'chip design simulation storage HPC'] },
]

/* Territory accounts that the per-account fetchers iterate over. Keep this
 * minimal — full UI shape lives in src/components/territory-plan.tsx. We
 * accept the duplication: this route runs server-side and should not import
 * UI components. Update both places when adding accounts. */
interface TerritoryAccount {
  name: string                 // canonical name used in API queries + timeline rows
  aliases?: string[]           // additional name variants for matching
  nih_org?: string             // exact org_names match for NIH Reporter
  sam_keyword?: string         // SAM.gov keyword (defaults to name)
  nsf_keyword?: string         // NSF awards keyword (defaults to name)
  sec_ticker?: string          // SEC EDGAR query token (defaults to name)
}

const TERRITORY_ACCOUNTS: TerritoryAccount[] = [
  { name: 'TGen', aliases: ['Translational Genomics Research Institute'], nih_org: 'TRANSLATIONAL GENOMICS RESEARCH INSTITUTE' },
  { name: 'Los Alamos National Laboratory', aliases: ['LANL', 'Triad National Security'], sam_keyword: 'Los Alamos National Laboratory' },
  { name: 'Sandia National Laboratories', aliases: ['Sandia'], sam_keyword: 'Sandia National Laboratories' },
  { name: 'NREL', aliases: ['National Renewable Energy Laboratory'], nsf_keyword: 'National Renewable Energy Laboratory', sam_keyword: 'National Renewable Energy Laboratory' },
  { name: 'Lockheed Martin', sam_keyword: 'Lockheed Martin', sec_ticker: 'Lockheed Martin' },
  { name: 'Micron Technology', sec_ticker: 'Micron Technology' },
  { name: 'Intel Corporation', aliases: ['Intel'], sec_ticker: 'Intel Corporation' },
  { name: 'Halliburton', sec_ticker: 'Halliburton' },
  { name: 'University of Utah', nih_org: 'UNIVERSITY OF UTAH', nsf_keyword: 'University of Utah' },
  { name: 'Colorado State University', nih_org: 'COLORADO STATE UNIVERSITY', nsf_keyword: 'Colorado State University' },
]

interface HarvestedSignal {
  company: string
  signal_type: string
  signal_text: string
  signal_date: string
  urgency: 'high' | 'medium' | 'low'
  amount: string | null
}

/* ── Existing sources ─────────────────────────────────────────── */

async function fetchGoogleNews(query: string): Promise<string[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const xml = await r.text()
    const titles: string[] = []
    const matches = xml.matchAll(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/g)
    for (const m of matches) {
      const t = m[1]?.trim()
      if (t && !t.includes('Google News') && t.length > 10) titles.push(t)
    }
    return titles.slice(0, 18)
  } catch (e: any) {
    console.error('[feed] fetchGoogleNews failed for query:', query, e.message)
    return []
  }
}

async function fetchFederalContracts(): Promise<string[]> {
  try {
    const keywords = ['unstructured+data+storage', 'high+performance+storage', 'data+lake+storage', 'video+evidence+storage', 'genomics+storage', 'HPC+filesystem']
    const kw = keywords[Math.floor(Math.random() * keywords.length)]
    const url = `https://api.usaspending.gov/api/v2/search/spending_by_award/?limit=6&page=1&sort=Award%20Amount&order=desc&subawards=false`
    const body = {
      filters: {
        keywords: [kw.replace(/\+/g, ' ')],
        time_period: [{ start_date: '2024-01-01', end_date: '2026-12-31' }],
      },
      fields: ['Award ID', 'Recipient Name', 'Description', 'Award Amount', 'Start Date'],
      limit: 6,
      page: 1,
      sort: 'Award Amount',
      order: 'desc',
      subawards: false,
    }
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    })
    const d = await r.json()
    return (d.results || []).map((c: any) =>
      `Federal Contract: ${c['Recipient Name']} - ${c['Description']?.slice(0, 120)} ($${(c['Award Amount'] || 0).toLocaleString()})`
    )
  } catch (e: any) {
    console.error('[feed] fetchFederalContracts failed:', e.message)
    return []
  }
}

/* ── New: vertical-specialty RSS feeds ─────────────────────────── */

interface RssItem { title: string; description: string }

async function fetchRSS(url: string, sourceLabel: string): Promise<RssItem[]> {
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Q-Intel/1.0 (sales intelligence research)' },
    })
    const xml = await r.text()
    const items: RssItem[] = []
    // Coarse RSS/Atom parse — we only need title and description text, not a
    // full feed model. Each <item> or <entry> typically has both fields.
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>|<entry>([\s\S]*?)<\/entry>/g)
    for (const m of itemMatches) {
      const block = m[1] || m[2] || ''
      const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)
      const descMatch  = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)
                       || block.match(/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/)
      const title = titleMatch?.[1]?.trim() ?? ''
      const description = (descMatch?.[1] ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      if (title.length > 5) items.push({ title, description: description.slice(0, 400) })
    }
    return items.slice(0, 25)
  } catch (e: any) {
    console.error(`[feed] ${sourceLabel} RSS failed:`, e.message)
    return []
  }
}

/**
 * Filter RSS items to those that mention an account by name in the title or
 * description, then map them to per-account harvested signals.
 */
function harvestRssMatches(items: RssItem[], sourceType: string, sourceLabel: string): HarvestedSignal[] {
  const out: HarvestedSignal[] = []
  for (const acct of TERRITORY_ACCOUNTS) {
    const candidates = [acct.name, ...(acct.aliases ?? [])]
    for (const item of items) {
      const haystack = `${item.title} ${item.description}`.toLowerCase()
      const hit = candidates.find(c => c.length > 3 && haystack.includes(c.toLowerCase()))
      if (hit) {
        out.push({
          company: acct.name,
          signal_type: sourceType,
          signal_text: `${sourceLabel}: ${item.title}`.slice(0, 300),
          signal_date: new Date().toISOString().slice(0, 7), // YYYY-MM (RSS items vary on date format)
          urgency: 'medium',
          amount: null,
        })
        break // one signal per item per account is plenty
      }
    }
  }
  return out
}

/* ── New: per-account public APIs ──────────────────────────────── */

async function fetchNIHGrants(acct: TerritoryAccount): Promise<HarvestedSignal[]> {
  const orgName = acct.nih_org
  if (!orgName) return [] // only accounts with a known NIH org match
  try {
    const r = await fetch('https://reporter.nih.gov/api/v2/projects/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ criteria: { org_names: [orgName] }, limit: 5, offset: 0 }),
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) return []
    const d = await r.json()
    const results = d.results ?? []
    return results.map((p: any) => {
      const title  = p.project_title ?? p.title ?? 'NIH project'
      const fy     = p.fiscal_year ?? ''
      const cost   = typeof p.award_amount === 'number' ? p.award_amount : (typeof p.total_cost === 'number' ? p.total_cost : null)
      const amount = cost ? `$${cost.toLocaleString()}` : null
      return {
        company: acct.name,
        signal_type: 'nih_grant',
        signal_text: `NIH Grant${fy ? ` (FY${fy})` : ''}: ${title}`.slice(0, 300),
        signal_date: fy ? `${fy}-01` : new Date().toISOString().slice(0, 7),
        urgency: 'medium',
        amount,
      }
    })
  } catch (e: any) {
    console.error(`[feed] NIH for ${acct.name} failed:`, e.message)
    return []
  }
}

async function fetchSamOpps(acct: TerritoryAccount): Promise<HarvestedSignal[]> {
  const keyword = acct.sam_keyword ?? acct.name
  try {
    // SAM.gov public search. DEMO_KEY is rate-limited (~30 req/hour) — for
    // production swap in a real api.data.gov key.
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const fmt = (d: Date) => `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`
    const params = new URLSearchParams({
      keywords: keyword,
      limit: '5',
      postedFrom: fmt(ninetyDaysAgo),
      postedTo: fmt(new Date()),
      api_key: process.env.SAM_GOV_API_KEY ?? 'DEMO_KEY',
    })
    const r = await fetch(`https://api.sam.gov/opportunities/v2/search?${params.toString()}`, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Q-Intel/1.0' },
    })
    if (!r.ok) return [] // 429/403 from DEMO_KEY rate limits — fail quiet
    const d = await r.json()
    const items = d.opportunitiesData ?? []
    return items.slice(0, 5).map((o: any) => ({
      company: acct.name,
      signal_type: 'sam_contract',
      signal_text: `SAM.gov ${o.type ?? 'Opportunity'}: ${o.title ?? '(untitled)'} — ${o.fullParentPathName ?? o.department ?? ''}`.slice(0, 300),
      signal_date: (o.postedDate ?? '').slice(0, 7) || new Date().toISOString().slice(0, 7),
      urgency: 'high',
      amount: o.award?.amount ? `$${Number(o.award.amount).toLocaleString()}` : null,
    }))
  } catch (e: any) {
    console.error(`[feed] SAM.gov for ${acct.name} failed:`, e.message)
    return []
  }
}

async function fetchNSFAwards(acct: TerritoryAccount): Promise<HarvestedSignal[]> {
  const keyword = acct.nsf_keyword
  if (!keyword) return []
  try {
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    const fmt = (d: Date) => `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`
    const params = new URLSearchParams({
      keyword,
      dateStart: fmt(oneYearAgo),
      rpp: '5',
      printFields: 'id,title,fundsObligatedAmt,startDate,awardeeName',
    })
    const r = await fetch(`https://api.nsf.gov/services/v1/awards.json?${params.toString()}`, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Q-Intel/1.0' },
    })
    if (!r.ok) return []
    const d = await r.json()
    const awards = d.response?.award ?? []
    return awards.slice(0, 5).map((a: any) => ({
      company: acct.name,
      signal_type: 'nsf_award',
      signal_text: `NSF Award: ${a.title ?? '(untitled)'}${a.awardeeName ? ` — ${a.awardeeName}` : ''}`.slice(0, 300),
      signal_date: (a.startDate ?? '').replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$1') || new Date().toISOString().slice(0, 7),
      urgency: 'medium',
      amount: a.fundsObligatedAmt ? `$${Number(a.fundsObligatedAmt).toLocaleString()}` : null,
    }))
  } catch (e: any) {
    console.error(`[feed] NSF for ${acct.name} failed:`, e.message)
    return []
  }
}

async function fetchSecFilings(acct: TerritoryAccount): Promise<HarvestedSignal[]> {
  const ticker = acct.sec_ticker
  if (!ticker) return [] // only public companies
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    const params = new URLSearchParams({
      q: `"${ticker}" "data center"`,
      forms: '8-K',
      dateRange: 'custom',
      startdt: fmt(ninetyDaysAgo),
      enddt: fmt(new Date()),
    })
    // SEC fair-use policy requires an identifying User-Agent
    const r = await fetch(`https://efts.sec.gov/LATEST/search-index?${params.toString()}`, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Q-Intel research bot contact@qumulo-intel.local' },
    })
    if (!r.ok) return []
    const d = await r.json()
    const hits = d.hits?.hits ?? []
    return hits.slice(0, 5).map((h: any) => {
      const src = h._source ?? {}
      const date = src.file_date ?? src.disclosure_date ?? new Date().toISOString().slice(0, 10)
      return {
        company: acct.name,
        signal_type: 'sec_filing',
        signal_text: `SEC ${src.form ?? '8-K'} (${date}): ${(src.display_names?.[0] ?? src.entity_name ?? acct.name)}`.slice(0, 300),
        signal_date: date.slice(0, 7),
        urgency: 'medium' as const,
        amount: null,
      }
    })
  } catch (e: any) {
    console.error(`[feed] SEC for ${acct.name} failed:`, e.message)
    return []
  }
}

/* ── Persistence helper ────────────────────────────────────────── */

async function persistSignals(
  db: ReturnType<typeof getDb>,
  signals: HarvestedSignal[]
) {
  if (signals.length === 0) return
  for (const s of signals) {
    try {
      await db.from('sg_signal_timeline').upsert(
        {
          company: s.company,
          signal_type: s.signal_type,
          urgency: s.urgency,
          signal_text: s.signal_text,
          signal_date: s.signal_date,
        },
        { onConflict: 'company,signal_text' }
      ).select()
    } catch (e: any) {
      console.error('[feed] timeline upsert failed for', s.company, '-', s.signal_type, ':', e.message)
    }
  }
}

/* ── Main GET handler ──────────────────────────────────────────── */

export async function GET(req: Request) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[feed] Missing Supabase env vars:', {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      })
      return NextResponse.json({ error: 'Server configuration error: missing database credentials', companies: [] }, { status: 500 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('[feed] Missing ANTHROPIC_API_KEY')
      return NextResponse.json({ error: 'Server configuration error: missing AI credentials', companies: [] }, { status: 500 })
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const { searchParams } = new URL(req.url)
    const force = searchParams.get('force') === '1'

    let db: ReturnType<typeof getDb>
    try {
      db = getDb()
    } catch (dbErr: any) {
      console.error('[feed] getDb() threw:', dbErr.message)
      return NextResponse.json({ error: 'Database connection failed', companies: [] }, { status: 500 })
    }

    if (!force) {
      try {
        const { data: cached, error: cacheError } = await db
          .from('sg_feed_cache')
          .select('*')
          .order('fetched_at', { ascending: false })
          .limit(1)
          .single()

        if (cacheError) {
          console.error('[feed] Cache check error:', cacheError.message, cacheError.code)
        }

        if (cached?.companies && cached.fetched_at) {
          const age = (Date.now() - new Date(cached.fetched_at).getTime()) / 3600000
          if (age < FEED_TTL_HOURS) {
            return NextResponse.json({ companies: cached.companies, fetched_at: cached.fetched_at, cached: true })
          }
        }
      } catch (cacheErr: any) {
        console.error('[feed] Cache check threw:', cacheErr.message, cacheErr.stack)
      }
    }

    /* ── Fan out every source in parallel via Promise.allSettled ── */
    const allHeadlines: string[] = []
    const verticalMap: Record<string, string[]> = {}

    // 1) Vertical Google News (existing)
    const newsPromises = VERTICALS.flatMap(v =>
      v.queries.map(q =>
        fetchGoogleNews(q).then(titles => ({ verticalId: v.id, titles }))
      )
    )

    // 2) Federal contracts (existing)
    const contractsPromise = fetchFederalContracts()

    // 3) Vertical-specialty RSS feeds
    const hpcwirePromise = fetchRSS('https://www.hpcwire.com/feed/', 'HPCwire')
    const fiercePromise  = fetchRSS('https://www.fiercehealthcare.com/rss/xml', 'FierceHealthcare')

    // 4) Per-account public APIs (each fetcher is self-contained and returns [] on failure)
    const perAccountPromises: Promise<HarvestedSignal[]>[] = []
    for (const acct of TERRITORY_ACCOUNTS) {
      perAccountPromises.push(
        fetchNIHGrants(acct),
        fetchSamOpps(acct),
        fetchNSFAwards(acct),
        fetchSecFilings(acct),
      )
    }

    const [
      newsResults,
      contracts,
      hpcwireItems,
      fierceItems,
      ...accountResults
    ] = await Promise.all([
      Promise.allSettled(newsPromises),
      contractsPromise,
      hpcwirePromise,
      fiercePromise,
      ...perAccountPromises,
    ])

    // Flatten Google News results into the existing per-vertical structure.
    for (const r of newsResults) {
      if (r.status !== 'fulfilled') continue
      const { verticalId, titles } = r.value
      titles.forEach(t => {
        allHeadlines.push(t)
        if (!verticalMap[verticalId]) verticalMap[verticalId] = []
        verticalMap[verticalId].push(t)
      })
    }

    contracts.forEach(c => allHeadlines.push(c))

    // Filter HPCwire / Fierce items by account-name match before surfacing.
    const hpcwireSignals = harvestRssMatches(hpcwireItems, 'hpcwire_news', 'HPCwire')
    const fierceSignals  = harvestRssMatches(fierceItems,  'fierce_healthcare', 'FierceHealthcare')

    // Mention-tagged headlines also get added to the broad headline pool so
    // Claude sees them when extracting companies.
    for (const s of [...hpcwireSignals, ...fierceSignals]) {
      allHeadlines.push(`${s.company}: ${s.signal_text}`)
    }

    // Per-account results are already typed as HarvestedSignal[].
    const perAccountSignals: HarvestedSignal[] = accountResults.flat()

    const harvested: HarvestedSignal[] = [
      ...hpcwireSignals,
      ...fierceSignals,
      ...perAccountSignals,
    ]

    console.log(
      '[feed] fetched',
      allHeadlines.length, 'headlines across', Object.keys(verticalMap).length, 'verticals,',
      perAccountSignals.length, 'per-account signals,',
      hpcwireSignals.length + fierceSignals.length, 'specialty-RSS matches'
    )

    if (allHeadlines.length === 0 && harvested.length === 0) {
      console.error('[feed] every source returned empty')
      try {
        const { data: stale } = await db.from('sg_feed_cache').select('*').order('fetched_at', { ascending: false }).limit(1).single()
        if (stale?.companies) return NextResponse.json({ companies: stale.companies, fetched_at: stale.fetched_at, cached: true, stale: true })
      } catch (staleErr: any) {
        console.error('[feed] Stale cache fallback threw:', staleErr.message)
      }
      return NextResponse.json({ error: 'No signals found and no cached data available', companies: [] }, { status: 503 })
    }

    // Persist per-account harvested signals into the timeline before Claude
    // sees the data — that way, if Claude fails, we still kept the new intel.
    await persistSignals(db, harvested)

    /* ── Claude extraction ── */
    const headlineBlock = VERTICALS.map(v =>
      `## ${v.label}\n${(verticalMap[v.id] || []).join('\n')}`
    ).join('\n\n')

    const harvestedBlock = harvested.length === 0 ? '' :
      `\n\n## Per-Account Public-Record Signals\n` +
      harvested.map(s => `[${s.signal_type}] ${s.company}: ${s.signal_text}${s.amount ? ` (${s.amount})` : ''}`).join('\n')

    let companies: any[]
    try {
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `You are a sales intelligence analyst for Qumulo, the unified global file system for unstructured data at exabyte scale.

${QUMULO_CONTEXT}

From these industry headlines, federal contracts, and per-account public records (NIH grants, SAM.gov opportunities, NSF awards, SEC filings, vertical news), extract 15-25 companies that likely have unstructured data growth, multi-cloud transitions, or legacy NAS (Isilon, NetApp, FlashBlade) refresh pressure that Qumulo can solve.

${headlineBlock}

## Federal Contracts
${allHeadlines.filter(h => h.startsWith('Federal Contract:')).join('\n')}
${harvestedBlock}

Return ONLY a JSON array. Each object:
{
  "company": "Company Name",
  "vertical_id": "media|lifesciences|research|finserv|government|geospatial|defense|energy|semiconductor",
  "vertical_label": "Full Vertical Name",
  "signal_count": number (1-5),
  "top_signal": "The key buying signal in one sentence",
  "signal_type": "news|funding|hiring|contract|partnership|earnings|research|regulation|nih_grant|sam_contract|nsf_award|sec_filing|hpcwire_news|fierce_healthcare",
  "urgency": "high|medium|low",
  "amount": "$X or null",
  "date": "YYYY-MM or approximate",
  "why_qumulo": "One sentence on why Qumulo specifically solves their unstructured data problem"
}

Focus on enterprises with unstructured data scale, cloud migrations, AI/ML buildout, or NAS displacement opportunities. Extract exactly 15 companies maximum. Keep why_qumulo and top_signal under 20 words each. Return ONLY the JSON array.`
        }]
      })

      const raw = (msg.content[0] as any).text || ''
      console.log('[feed] Claude response length:', raw.length, 'chars')

      let json = raw
      const fenceMatch = json.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (fenceMatch) json = fenceMatch[1]
      json = json.trim()
      if (!json.startsWith('[')) {
        const arrStart = json.indexOf('[')
        if (arrStart >= 0) json = json.slice(arrStart)
      }

      if (!json.endsWith(']')) {
        const lastComplete = json.lastIndexOf('}')
        if (lastComplete > 0) json = json.slice(0, lastComplete + 1) + ']'
      }

      companies = JSON.parse(json)
      console.log('[feed] Parsed', companies.length, 'companies from Claude')
    } catch (claudeErr: any) {
      console.error('[feed] Claude extraction failed:', claudeErr.message, claudeErr.stack)
      try {
        const { data: stale } = await db.from('sg_feed_cache').select('*').order('fetched_at', { ascending: false }).limit(1).single()
        if (stale?.companies) return NextResponse.json({ companies: stale.companies, fetched_at: stale.fetched_at, cached: true, stale: true })
      } catch (staleErr: any) {
        console.error('[feed] Stale cache fallback threw:', staleErr.message)
      }
      return NextResponse.json({ error: claudeErr.message || 'Feed extraction failed', companies: [] }, { status: 500 })
    }

    // Write Claude's company-summary signals into timeline (existing behavior).
    for (const c of companies) {
      try {
        await db.from('sg_signal_timeline').upsert(
          { company: c.company, signal_type: c.signal_type, urgency: c.urgency, signal_text: c.top_signal, signal_date: c.date },
          { onConflict: 'company,signal_text' }
        ).select()
      } catch (tlErr: any) {
        console.error('[feed] Timeline upsert failed for', c.company, ':', tlErr.message)
      }
    }

    try {
      const { error: insertErr } = await db.from('sg_feed_cache').insert({ companies })
      if (insertErr) console.error('[feed] Cache insert error:', insertErr.message, insertErr.code)
    } catch (cacheInsertErr: any) {
      console.error('[feed] Cache insert threw:', cacheInsertErr.message)
    }

    return NextResponse.json({ companies, fetched_at: new Date().toISOString(), cached: false })
  } catch (outerErr: any) {
    console.error('[feed] Unhandled error in GET:', outerErr.message, outerErr.stack)
    return NextResponse.json({ error: outerErr.message || 'Internal server error', companies: [] }, { status: 500 })
  }
}
