'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface GraphNode {
  id: string
  label: string
  type: 'source' | 'route' | 'ai' | 'database' | 'view'
  x: number
  y: number
  description: string
  inputs: string[]
  outputs: string[]
  tech: string
}

interface GraphEdge {
  from: string
  to: string
  label: string
}

const NODES: GraphNode[] = [
  // External Sources (x=80)
  { id: 'google_rss', label: 'Google News\nRSS', type: 'source', x: 80, y: 130,
    description: 'Google News RSS search API. Fetches 18 headlines per query across 6 ICP verticals (FinServ, Healthcare, Manufacturing, Energy, Government, Technology).',
    inputs: ['HTTP GET with search query'], outputs: ['XML RSS feed with <title> elements'], tech: 'news.google.com/rss/search • 8s timeout • 18 titles per query' },
  { id: 'usaspending', label: 'USASpending\n.gov', type: 'source', x: 80, y: 310,
    description: 'Federal contract and grant search API. Queries for data integration, knowledge management, and graph database contracts.',
    inputs: ['POST with keyword filters + time_period'], outputs: ['JSON: Recipient Name, Description, Award Amount'], tech: 'api.usaspending.gov/api/v2/search/spending_by_award • 8s timeout' },
  { id: 'web_scraper', label: 'Website\nScraper', type: 'source', x: 80, y: 490,
    description: 'Company website scraper. Strips scripts/styles/tags, collapses whitespace. Infers domain from company name if not provided.',
    inputs: ['Company domain or inferred URL'], outputs: ['Plain text, truncated to 4000 chars'], tech: 'fetch() with Mozilla UA • 6s timeout • regex HTML stripping' },

  // API Routes (x=310)
  { id: 'api_feed', label: '/api/feed', type: 'route', x: 310, y: 130,
    description: 'GET handler. Fetches RSS headlines from all 6 verticals (18 queries), federal contracts, then sends to Claude for company extraction. Caches results in q_feed_cache.',
    inputs: ['?force=1 to skip cache'], outputs: ['{ companies[], fetched_at, cached }'], tech: 'src/app/api/feed/route.ts • GET • 60s maxDuration' },
  { id: 'api_analyze', label: '/api/analyze', type: 'route', x: 310, y: 310,
    description: 'POST handler. Scrapes company website, fetches news + contracts in parallel, sends to Claude for deep analysis. Returns full Intel object with Qumulo fit scoring.',
    inputs: ['{ company, domain? }'], outputs: ['{ intel: Intel, cached, analyzed_at }'], tech: 'src/app/api/analyze/route.ts • POST • 60s maxDuration' },
  { id: 'api_timeline', label: '/api/timeline', type: 'route', x: 310, y: 460,
    description: 'GET handler. Queries q_signal_timeline for a given company. Returns chronological signal history, ordered by first_seen_at DESC.',
    inputs: ['?company=Name'], outputs: ['{ timeline: TimelineEntry[] }'], tech: 'src/app/api/timeline/route.ts • GET • 30s maxDuration' },
  { id: 'api_meddpicc', label: '/api/meddpicc', type: 'route', x: 310, y: 600,
    description: 'POST handler. Accepts raw call notes, sends to Claude for MEDDPICC gap analysis. Returns structured output: gaps, LOU draft, threading recs, next steps.',
    inputs: ['{ notes, account }'], outputs: ['{ analysis: { meddpicc[], lou, threading[], next_steps[] } }'], tech: 'src/app/api/meddpicc/route.ts • POST • 4096 max_tokens' },

  // AI Engine (x=540)
  { id: 'claude_haiku', label: 'Claude\nHaiku 4.5', type: 'ai', x: 540, y: 310,
    description: 'Anthropic Claude Haiku 4.5 model. Central inference engine for all intelligence extraction, company analysis, MEDDPICC coaching, and signal classification.',
    inputs: ['Structured prompts with context data'], outputs: ['JSON responses: companies, Intel objects, analysis'], tech: 'claude-haiku-4-5-20251001 • @anthropic-ai/sdk • JSON mode' },

  // Supabase Tables (x=730)
  { id: 'sg_feed_cache', label: 'sg_feed\n_cache', type: 'database', x: 730, y: 100,
    description: 'Feed snapshot cache. Stores full company list as JSONB with timestamp. 12-hour TTL. Stale cache served as fallback on API failure.',
    inputs: ['INSERT: { companies: jsonb }'], outputs: ['SELECT: latest snapshot within TTL'], tech: 'Supabase • uuid PK • idx on fetched_at DESC • 12h TTL' },
  { id: 'sg_company_intel', label: 'sg_company\n_intel', type: 'database', x: 730, y: 280,
    description: 'Per-company analysis cache. Primary key on company name. Stores full Intel JSONB object. 24-hour TTL before re-analysis.',
    inputs: ['UPSERT on company: { intel, vertical, urgency }'], outputs: ['SELECT by company with TTL check'], tech: 'Supabase • text PK (company) • JSONB intel column • 24h TTL' },
  { id: 'sg_signal_timeline', label: 'sg_signal\n_timeline', type: 'database', x: 730, y: 460,
    description: 'Deduplicated signal history. Unique constraint on (company, signal_text) prevents duplicate signals. Chronological record of all detected buying signals.',
    inputs: ['UPSERT: { company, signal_type, urgency, signal_text }'], outputs: ['SELECT by company ORDER BY first_seen_at DESC LIMIT 50'], tech: 'Supabase • UNIQUE(company, signal_text) • idx on (company, first_seen_at)' },

  // UI Views (x=950)
  { id: 'signal_feed_ui', label: 'Signal Feed\nTab', type: 'view', x: 950, y: 150,
    description: 'Combined signal feed and company search. Search bar at top for deep-dive analysis. Live feed of companies with buying signals below. Filterable by vertical and urgency. Expandable cards with IntelCard and timeline views.',
    inputs: ['GET /api/feed', 'POST /api/analyze', 'GET /api/timeline'], outputs: ['Interactive company cards, IntelCard, search results'], tech: 'signal-feed.tsx • React client component • IntelCard shared component' },
  { id: 'meddpicc_ui', label: 'MEDDPICC\nTab', type: 'view', x: 950, y: 380,
    description: 'Notes-in, brief-out deal analysis tool. Large textarea for raw call notes. Returns structured MEDDPICC gap analysis, draft LOU, multi-threading recommendations, and next steps.',
    inputs: ['User call notes + account name'], outputs: ['Structured analysis cards'], tech: 'meddpicc-builder.tsx • POST /api/meddpicc' },
  { id: 'territory_ui', label: 'Territory\nPlan Tab', type: 'view', x: 950, y: 530,
    description: '10 pre-researched Qumulo target accounts in the AZ/NM/UT/CO commercial territory, with displacement stories, key personas (LinkedIn-linked), and estimated ACV. AI deep-dive on demand via /api/analyze.',
    inputs: ['Static account data', 'POST /api/analyze on demand'], outputs: ['Account cards with LinkedIn persona links'], tech: 'territory-plan.tsx • $3.9M pipeline • 6 verticals' },
  { id: 'knowledge_graph_ui', label: 'Knowledge\nGraph Tab', type: 'view', x: 950, y: 650,
    description: 'This view. Interactive SVG rendering of the platform architecture as a knowledge graph. Visible only in Architect Mode. Nodes represent real code components; edges represent actual data operations.',
    inputs: ['Static graph data (this component)'], outputs: ['Interactive SVG with detail panel'], tech: 'knowledge-graph.tsx • Admin-only • Self-referencing' },
]

const EDGES: GraphEdge[] = [
  // /api/feed data flow
  { from: 'google_rss', to: 'api_feed', label: 'fetches_rss' },
  { from: 'usaspending', to: 'api_feed', label: 'fetches_contracts' },
  { from: 'api_feed', to: 'claude_haiku', label: 'calls_claude' },
  { from: 'api_feed', to: 'sg_feed_cache', label: 'writes_cache' },
  { from: 'sg_feed_cache', to: 'api_feed', label: 'reads_cache' },
  { from: 'api_feed', to: 'sg_signal_timeline', label: 'upserts_signals' },

  // /api/analyze data flow
  { from: 'google_rss', to: 'api_analyze', label: 'fetches_news' },
  { from: 'usaspending', to: 'api_analyze', label: 'fetches_contracts' },
  { from: 'web_scraper', to: 'api_analyze', label: 'scrapes_site' },
  { from: 'api_analyze', to: 'claude_haiku', label: 'calls_claude' },
  { from: 'api_analyze', to: 'sg_company_intel', label: 'writes_intel' },
  { from: 'sg_company_intel', to: 'api_analyze', label: 'reads_cache' },
  { from: 'api_analyze', to: 'sg_signal_timeline', label: 'upserts_signals' },

  // /api/timeline data flow
  { from: 'api_timeline', to: 'sg_signal_timeline', label: 'queries_db' },

  // /api/meddpicc data flow
  { from: 'api_meddpicc', to: 'claude_haiku', label: 'calls_claude' },

  // UI → API connections
  { from: 'signal_feed_ui', to: 'api_feed', label: 'GET_feed' },
  { from: 'signal_feed_ui', to: 'api_analyze', label: 'POST_analyze' },
  { from: 'signal_feed_ui', to: 'api_timeline', label: 'GET_timeline' },
  { from: 'meddpicc_ui', to: 'api_meddpicc', label: 'POST_notes' },
  { from: 'territory_ui', to: 'api_analyze', label: 'POST_analyze' },
]

const TYPE_COLORS: Record<string, { fill: string; stroke: string; text: string; label: string; glow?: string }> = {
  source: { fill: '#164e63', stroke: '#06b6d4', text: '#67e8f9', label: 'External Data Source' },
  route: { fill: '#1e1b4b', stroke: '#818cf8', text: '#c7d2fe', label: 'API Route' },
  ai: { fill: '#4c1d95', stroke: '#8b5cf6', text: '#c4b5fd', label: 'AI Engine', glow: '#8b5cf6' },
  database: { fill: '#064e3b', stroke: '#10b981', text: '#6ee7b7', label: 'Supabase Table' },
  view: { fill: '#831843', stroke: '#f43f5e', text: '#fda4af', label: 'UI Component' },
}

function bezierPath(from: GraphNode, to: GraphNode) {
  const dx = to.x - from.x
  const cpx = dx * 0.45
  return `M ${from.x} ${from.y} C ${from.x + cpx} ${from.y}, ${to.x - cpx} ${to.y}, ${to.x} ${to.y}`
}

export default function KnowledgeGraph() {
  const [selected, setSelected] = useState<GraphNode | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)

  const connectedNodes = new Set<string>()
  if (hovered) {
    connectedNodes.add(hovered)
    EDGES.forEach(e => {
      if (e.from === hovered) connectedNodes.add(e.to)
      if (e.to === hovered) connectedNodes.add(e.from)
    })
  }

  const nodeMap: Record<string, GraphNode> = {}
  NODES.forEach(n => { nodeMap[n.id] = n })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Platform Knowledge Graph</h2>
        <p className="text-sm text-slate-400">
          Code architecture of Q-Intel rendered as an interactive knowledge graph &mdash; real components, actual data operations, true system topology
        </p>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 rounded-xl bg-[#060a14] border border-white/10 overflow-hidden relative">
          <svg viewBox="0 0 1050 720" className="w-full h-auto">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#334155" />
              </marker>
              <marker id="arr-on" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#67e8f9" />
              </marker>
            </defs>

            {/* Column Labels */}
            {[
              { x: 80, label: 'EXTERNAL SOURCES' },
              { x: 310, label: 'API ROUTES' },
              { x: 540, label: 'AI ENGINE' },
              { x: 730, label: 'SUPABASE TABLES' },
              { x: 950, label: 'UI COMPONENTS' },
            ].map(col => (
              <text key={col.label} x={col.x} y={35} textAnchor="middle" fill="#334155" fontSize="10" fontWeight="bold" letterSpacing="2">
                {col.label}
              </text>
            ))}

            {/* Edges */}
            {EDGES.map((e, i) => {
              const from = nodeMap[e.from]
              const to = nodeMap[e.to]
              if (!from || !to) return null
              const isActive = hovered && connectedNodes.has(e.from) && connectedNodes.has(e.to)
              return (
                <g key={i}>
                  <path
                    d={bezierPath(from, to)}
                    fill="none"
                    stroke={isActive ? '#67e8f9' : '#1e293b'}
                    strokeWidth={isActive ? 2 : 1}
                    strokeDasharray={isActive ? 'none' : '4 4'}
                    markerEnd={isActive ? 'url(#arr-on)' : 'url(#arr)'}
                    opacity={hovered && !isActive ? 0.12 : 1}
                    className="transition-all duration-300"
                  />
                  {isActive && (
                    <text
                      x={(from.x + to.x) / 2}
                      y={(from.y + to.y) / 2 - 8}
                      textAnchor="middle"
                      fill="#67e8f9"
                      fontSize="8"
                      fontFamily="monospace"
                      className="pointer-events-none"
                    >
                      {e.label}
                    </text>
                  )}
                </g>
              )
            })}

            {/* Nodes */}
            {NODES.map(node => {
              const tc = TYPE_COLORS[node.type]
              const isHovered = hovered === node.id
              const isConnected = connectedNodes.has(node.id)
              const dimmed = hovered && !isConnected
              const r = node.type === 'ai' ? 38 : 30
              return (
                <g
                  key={node.id}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setSelected(node)}
                  className="cursor-pointer"
                  opacity={dimmed ? 0.15 : 1}
                  style={{ transition: 'opacity 0.3s' }}
                >
                  {tc.glow && (
                    <circle cx={node.x} cy={node.y} r={r + 8} fill={tc.glow} opacity={isHovered ? 0.3 : 0.1} filter="url(#glow)" />
                  )}
                  <circle
                    cx={node.x} cy={node.y}
                    r={isHovered ? r + 3 : r}
                    fill={tc.fill} stroke={tc.stroke}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    className="transition-all duration-200"
                  />
                  {node.label.split('\n').map((line, i, arr) => (
                    <text key={i} x={node.x} y={node.y + (i - (arr.length - 1) / 2) * 12}
                      textAnchor="middle" dominantBaseline="central"
                      fill={tc.text} fontSize={node.type === 'ai' ? '11' : '9'} fontWeight="600"
                      fontFamily={node.type === 'route' || node.type === 'database' ? 'monospace' : 'inherit'}
                      className="pointer-events-none select-none"
                    >{line}</text>
                  ))}
                </g>
              )
            })}
          </svg>

          <div className="absolute bottom-4 left-4 flex flex-wrap gap-3">
            {Object.entries(TYPE_COLORS).map(([, tc]) => (
              <div key={tc.label} className="flex items-center gap-1.5 text-[10px]">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tc.stroke }} />
                <span style={{ color: tc.text }}>{tc.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="w-80 rounded-xl bg-white/[0.03] border border-white/10 p-5 space-y-4 flex-shrink-0 max-h-[700px] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TYPE_COLORS[selected.type].stroke }} />
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: TYPE_COLORS[selected.type].text }}>
                    {TYPE_COLORS[selected.type].label}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1 font-mono">{selected.label.replace('\n', ' ')}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">{selected.description}</p>

            {/* Inputs */}
            <div>
              <h4 className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">Inputs</h4>
              {selected.inputs.map((inp, i) => (
                <div key={i} className="text-xs text-slate-400 flex items-start gap-2 mb-1">
                  <span className="text-cyan-500 mt-0.5">&larr;</span>
                  <span className="font-mono">{inp}</span>
                </div>
              ))}
            </div>

            {/* Outputs */}
            <div>
              <h4 className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">Outputs</h4>
              {selected.outputs.map((out, i) => (
                <div key={i} className="text-xs text-slate-400 flex items-start gap-2 mb-1">
                  <span className="text-emerald-500 mt-0.5">&rarr;</span>
                  <span className="font-mono">{out}</span>
                </div>
              ))}
            </div>

            {/* Tech */}
            <div className="pt-2 border-t border-white/10">
              <h4 className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">Implementation</h4>
              <p className="text-xs text-slate-400 font-mono leading-relaxed">{selected.tech}</p>
            </div>

            {/* Relationships */}
            <div className="pt-2 border-t border-white/10">
              <h4 className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Relationships</h4>
              <div className="space-y-1.5">
                {EDGES.filter(e => e.from === selected.id || e.to === selected.id).map((e, i) => {
                  const isFrom = e.from === selected.id
                  const other = nodeMap[isFrom ? e.to : e.from]
                  if (!other) return null
                  const otherColor = TYPE_COLORS[other.type]
                  return (
                    <div key={i}
                      className="flex items-center gap-2 text-xs p-2 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10 transition-all"
                      onClick={() => setSelected(other)}
                    >
                      <span className="text-slate-500">{isFrom ? '\u2192' : '\u2190'}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ backgroundColor: `${otherColor.stroke}20`, color: otherColor.text }}>
                        {e.label}
                      </span>
                      <span className="text-slate-300 font-mono text-[11px]">{other.label.replace('\n', ' ')}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Entity Properties */}
            <div className="pt-2 border-t border-white/10">
              <h4 className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Entity Properties</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">entity_id</span><span className="text-slate-300 font-mono">{selected.id}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">entity_type</span><span style={{ color: TYPE_COLORS[selected.type].text }}>{selected.type}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">in_degree</span><span className="text-slate-300">{EDGES.filter(e => e.to === selected.id).length}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">out_degree</span><span className="text-slate-300">{EDGES.filter(e => e.from === selected.id).length}</span></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Graph Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Entities', value: NODES.length, color: 'text-cyan-400' },
          { label: 'Relationships', value: EDGES.length, color: 'text-emerald-400' },
          { label: 'Entity Types', value: Object.keys(TYPE_COLORS).length, color: 'text-violet-400' },
          { label: 'Relationship Types', value: new Set(EDGES.map(e => e.label)).size, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
