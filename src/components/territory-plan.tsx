'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, DollarSign, Building2, ChevronDown, ChevronUp, RefreshCw, Sparkles, ExternalLink, Copy, Check, List, Map, Upload, X, Loader2 } from 'lucide-react'
import { VERTICAL_COLORS } from '@/lib/types'
import type { Intel, Contact } from '@/lib/types'

const TerritoryMap = dynamic(() => import('./territory-map'), { ssr: false })

interface Account {
  rank: number
  company: string
  vertical: string
  vertical_id: string
  revenue: string
  hq_city: string
  hq_state: string
  lat: number
  lng: number
  data_challenge: string
  stardog_fit: string
  entry_strategy: string
  key_personas: string[]
  est_acv: string
}

/* Territory: AZ / NM / UT / CO commercial, $500M-$2B band with flex.
 * These are real public companies with visible unstructured-data signals
 * that map to Qumulo's wedge. The displacement story for each names the
 * likely incumbent.
 */
const DEFAULT_ACCOUNTS: Account[] = [
  {
    rank: 1,
    company: 'TGen (Translational Genomics Research Institute)',
    vertical: 'Healthcare & Life Sciences',
    vertical_id: 'lifesciences',
    revenue: '$120M operating',
    hq_city: 'Phoenix',
    hq_state: 'AZ',
    lat: 33.4484, lng: -112.074,
    data_challenge: 'Sequencing throughput growing 40-60% YoY against an aging Isilon footprint. Researchers need NFS/SMB on the same data AWS HealthOmics consumes as S3.',
    stardog_fit: 'Cloud-native single namespace running on-prem and in AWS, with NFS+SMB+S3 on the same dataset. NeuralCache delivers flash-class throughput at HDD economics. Eliminates the copy-to-S3 tax and rehydration latency.',
    entry_strategy: 'Open through Director of Research Computing on the Isilon refresh cycle. Reference Wellcome Sanger and Hudson Alpha. Position multi-cloud parity as the unlock for AWS HealthOmics adoption.',
    key_personas: ['Chief Information Officer', 'Director of Research Computing', 'VP Bioinformatics', 'Cloud Architect'],
    est_acv: '$450K - $900K',
  },
  {
    rank: 2,
    company: 'Triad National Security / Los Alamos National Laboratory',
    vertical: 'Research / National Labs',
    vertical_id: 'research',
    revenue: '$3.8B annual',
    hq_city: 'Los Alamos',
    hq_state: 'NM',
    lat: 35.8800, lng: -106.3031,
    data_challenge: 'Lustre HPC scratch is fine. Cross-program collaboration tier on aging NetApp is the friction point. NNSA pressure to consolidate vendors.',
    stardog_fit: 'Software-defined platform on HPE / Dell hardware already on the lab approved list. Single namespace bridges NFS/SMB collaboration tiers. Real-time per-file analytics map cleanly to classified data lineage requirements.',
    entry_strategy: 'GSA / HPE GreenLake path. Lead with NREL reference. Target collaboration tier first, simulation tier later. ASC roadmap window in spring.',
    key_personas: ['CIO / Associate Director for IT', 'Division Leader, HPC', 'Director, Research Library', 'CISO'],
    est_acv: '$1M - $3M+',
  },
  {
    rank: 3,
    company: 'Sandia National Laboratories',
    vertical: 'Research / National Labs',
    vertical_id: 'research',
    revenue: '$4.2B annual',
    hq_city: 'Albuquerque',
    hq_state: 'NM',
    lat: 35.0844, lng: -106.6504,
    data_challenge: 'Mission systems data, simulation output, and classified collaboration spread across legacy NAS and Lustre. Cross-site replication to Livermore is operationally heavy.',
    stardog_fit: 'Single global namespace bridges Albuquerque, Livermore, and selected GovCloud regions. Multi-protocol on the same data eliminates duplicate Windows-share copies. Software-defined ride-out across hardware refresh cycles.',
    entry_strategy: 'Through systems integrators on the approved vendor list. Position the global namespace story for cross-site classification-aware replication. Reference LANL and NREL.',
    key_personas: ['CIO', 'Director, Computing & Information Systems', 'Manager, Mission Data', 'CISO'],
    est_acv: '$1M - $2.5M',
  },
  {
    rank: 4,
    company: 'NREL (National Renewable Energy Laboratory)',
    vertical: 'Research / National Labs',
    vertical_id: 'research',
    revenue: '$700M annual',
    hq_city: 'Golden',
    hq_state: 'CO',
    lat: 39.7406, lng: -105.1719,
    data_challenge: 'Climate and grid simulation output growing fast. Researcher access to historical runs hampered by tape rehydration. Multiple departmental silos.',
    stardog_fit: 'Already a known Qumulo footprint; expansion play. NeuralCache hot/warm tiering replaces tape-rehydration pain. Cloud-native option enables AWS bursts for grid simulation.',
    entry_strategy: 'Account expansion. Target the grid simulation team and the climate modeling tier. Lead with NeuralCache for the warm-data resurrection problem.',
    key_personas: ['Director, Computational Science', 'Group Manager, HPC', 'Lead Storage Architect', 'Cloud Architect'],
    est_acv: '$300K - $700K expansion',
  },
  {
    rank: 5,
    company: 'Lockheed Martin Space (Waterton facility)',
    vertical: 'Defense & Aerospace',
    vertical_id: 'defense',
    revenue: '$67B corporate; $13B segment',
    hq_city: 'Littleton',
    hq_state: 'CO',
    lat: 39.5728, lng: -105.0739,
    data_challenge: 'Simulation, CAD, and mission-data tiers fragmented across NetApp and Isilon. Customer programs (USSF, NRO) increasingly require IL5/IL6 cloud-native architecture for the next bid.',
    stardog_fit: 'Same software runs in customer datacenter and AWS GovCloud / Azure Government. Single namespace lets engineers work the same dataset on-prem or in the cloud. Multi-protocol unifies CAD (SMB), simulation (NFS), and ML pipelines (S3).',
    entry_strategy: 'Through Mission Systems CTO via program-of-record bids. Reference defense primes already on Qumulo. Position around USSF cloud mandates.',
    key_personas: ['Mission Systems CTO', 'Director, Cloud & Infrastructure Engineering', 'Geospatial Tech Lead', 'Program Capture Manager'],
    est_acv: '$600K - $1.5M per program',
  },
  {
    rank: 6,
    company: 'Micron Technology (Lehi fab)',
    vertical: 'Semiconductor',
    vertical_id: 'semiconductor',
    revenue: '$25B corporate',
    hq_city: 'Lehi',
    hq_state: 'UT',
    lat: 40.3916, lng: -111.8508,
    data_challenge: 'EDA verification farm hammers NFS metadata; ONTAP cluster sprawl creates operator headcount drag. AWS EDA burst breaks job-level SLAs due to data movement.',
    stardog_fit: 'NFS at scale on a single cluster, with NeuralCache delivering the verification throughput. Same software runs in AWS so EDA burst stops being a data-movement project.',
    entry_strategy: 'Through Director of EDA Compute and the Manufacturing IT VP at Lehi. Lead with consolidation TCO vs. NetApp cluster sprawl. Time to FY26 capacity buy.',
    key_personas: ['VP, Manufacturing IT', 'Director, EDA Compute & Storage', 'Principal Storage Architect', 'Cloud Architect, EDA'],
    est_acv: '$800K - $2M per fab',
  },
  {
    rank: 7,
    company: 'Intel Corporation (Chandler / Ocotillo)',
    vertical: 'Semiconductor',
    vertical_id: 'semiconductor',
    revenue: '$54B corporate; multi-billion site capex',
    hq_city: 'Chandler',
    hq_state: 'AZ',
    lat: 33.3062, lng: -111.8413,
    data_challenge: 'CHIPS Act expansion drives capacity build-out. EDA, lithography sim, and defect imaging tiers spread across legacy NAS. Multi-fab coordination is a manual data-copy exercise.',
    stardog_fit: 'Global namespace bridges Chandler, Ocotillo, and Hillsboro tiers. Cloud-native option for EDA burst. Real-time analytics on per-file access map cleanly to fab-floor data sovereignty needs.',
    entry_strategy: 'Through site IT leadership at Ocotillo. Land a workload, expand. Time to CHIPS Act milestone capex unlocks.',
    key_personas: ['Site Director, Manufacturing IT', 'Principal Engineer, Storage Architecture', 'Director, EDA Computing', 'Cloud Architect'],
    est_acv: '$1M - $3M per fab',
  },
  {
    rank: 8,
    company: 'Halliburton (Houston HQ; CO/NM field ops)',
    vertical: 'Energy',
    vertical_id: 'energy',
    revenue: '$23B corporate',
    hq_city: 'Denver',
    hq_state: 'CO',
    lat: 39.7392, lng: -104.9903,
    data_challenge: 'Seismic and geomodel data multi-PB per basin. Field ops in Permian and DJ Basin generate sensor data faster than the centralized tier can absorb. Cloud transformation underway but data gravity is real.',
    stardog_fit: 'Cloud-native running in the operator\'s preferred cloud, with edge clusters in the basin replicating into the global namespace. NeuralCache addresses re-processing economics on the warm tier.',
    entry_strategy: 'Through digital transformation office. Land the basin-edge use case first. Reference oil-and-gas peers. Position multi-cloud as a hedge against single-vendor lock.',
    key_personas: ['VP Digital Transformation', 'Director, Subsurface Data Science', 'Lead Cloud Architect', 'Field Ops IT Manager'],
    est_acv: '$400K - $900K initial',
  },
  {
    rank: 9,
    company: 'University of Utah (Health Sciences + Research Computing)',
    vertical: 'Research / Higher Ed',
    vertical_id: 'research',
    revenue: '$5.8B operating (incl. health)',
    hq_city: 'Salt Lake City',
    hq_state: 'UT',
    lat: 40.7649, lng: -111.8421,
    data_challenge: 'Carnegie R1 with major NIH and NSF programs. Imaging, genomics, and HPC tiers spread across departmental silos. Central IT under cost pressure on the Isilon refresh.',
    stardog_fit: 'Single global namespace consolidates departmental sprawl over time. Software-defined ride-out independent of Dell/HPE relationship. Cloud-native option for AWS and Azure-backed research workloads.',
    entry_strategy: 'Existing Qumulo customer relationship; expansion play into Health Sciences and central IT consolidation. Reference CSU and NREL.',
    key_personas: ['CIO', 'Director, Center for High Performance Computing', 'Associate VP Research', 'Senior Storage Engineer'],
    est_acv: '$400K - $900K expansion',
  },
  {
    rank: 10,
    company: 'Colorado State University',
    vertical: 'Research / Higher Ed',
    vertical_id: 'research',
    revenue: '$1.4B operating',
    hq_city: 'Fort Collins',
    hq_state: 'CO',
    lat: 40.5853, lng: -105.0844,
    data_challenge: 'Aging Isilon in central IT. PI-controlled departmental storage sprawl. NSF and NIH data-management plans force central IT involvement.',
    stardog_fit: 'Consolidates central tier and pulls in departmental sprawl over time. Cloud-native option lets PIs run AWS or Azure workloads against the same filesystem. Software-defined freedom from Dell hardware lock-in.',
    entry_strategy: 'Through CIO on the Isilon refresh in FY26. Reference University of Utah. Lead with the data-management-plan consolidation story for the Associate VP Research.',
    key_personas: ['CIO', 'Director, Research Computing & Cyberinfrastructure', 'Associate Vice President, Research', 'Senior Storage Engineer'],
    est_acv: '$300K - $700K initial',
  },
]

/* ── City coordinate lookup for imported accounts ── */

const CITY_COORDS: Record<string, [number, number]> = {
  // Territory states first
  'phoenix': [33.4484, -112.074], 'tucson': [32.2226, -110.9747], 'mesa': [33.4152, -111.8315],
  'tempe': [33.4255, -111.9400], 'chandler': [33.3062, -111.8413], 'scottsdale': [33.4942, -111.9261],
  'flagstaff': [35.1983, -111.6513], 'glendale': [33.5387, -112.1860], 'peoria': [33.5806, -112.2374],
  'albuquerque': [35.0844, -106.6504], 'santa fe': [35.6870, -105.9378], 'las cruces': [32.3199, -106.7637],
  'rio rancho': [35.2328, -106.6630], 'roswell': [33.3943, -104.5230], 'los alamos': [35.8800, -106.3031],
  'farmington': [36.7281, -108.2187], 'hobbs': [32.7026, -103.1360], 'carlsbad': [32.4207, -104.2288],
  'salt lake city': [40.7608, -111.891], 'provo': [40.2338, -111.6585], 'orem': [40.2969, -111.6946],
  'sandy': [40.5649, -111.8389], 'west jordan': [40.6097, -111.9391], 'ogden': [41.2230, -111.9738],
  'lehi': [40.3916, -111.8508], 'park city': [40.6461, -111.4980], 'logan': [41.7370, -111.8338],
  'denver': [39.7392, -104.9903], 'colorado springs': [38.8339, -104.8214], 'aurora': [39.7294, -104.8319],
  'fort collins': [40.5853, -105.0844], 'lakewood': [39.7047, -105.0814], 'thornton': [39.8680, -104.9719],
  'arvada': [39.8028, -105.0875], 'westminster': [39.8367, -105.0372], 'pueblo': [38.2544, -104.6091],
  'centennial': [39.5807, -104.8772], 'boulder': [40.0150, -105.2705], 'greeley': [40.4233, -104.7091],
  'longmont': [40.1672, -105.1019], 'loveland': [40.3978, -105.0749], 'broomfield': [39.9205, -105.0867],
  'grand junction': [39.0639, -108.5506], 'castle rock': [39.3722, -104.8561], 'littleton': [39.5728, -105.0739],
  'parker': [39.5186, -104.7613], 'commerce city': [39.8083, -104.9339], 'golden': [39.7406, -105.1719],
  'durango': [37.2753, -107.8801], 'evergreen': [39.6333, -105.3172], 'lone tree': [39.5331, -104.8867],
  // Fallback US cities
  'new york': [40.7128, -74.006], 'los angeles': [34.0522, -118.2437], 'chicago': [41.8781, -87.6298],
  'houston': [29.7604, -95.3698], 'philadelphia': [39.9526, -75.1652], 'san antonio': [29.4241, -98.4936],
  'san diego': [32.7157, -117.1611], 'dallas': [32.7767, -96.797], 'san jose': [37.3382, -121.8863],
  'austin': [30.2672, -97.7431], 'san francisco': [37.7749, -122.4194], 'seattle': [47.6062, -122.3321],
  'boston': [42.3601, -71.0589], 'washington': [38.9072, -77.0369], 'atlanta': [33.749, -84.388],
}

function lookupCoords(city: string): { lat: number; lng: number } {
  if (!city) return { lat: 0, lng: 0 }
  const coords = CITY_COORDS[city.toLowerCase().trim()]
  return coords ? { lat: coords[0], lng: coords[1] } : { lat: 0, lng: 0 }
}

function mapVerticalId(vertical: string): string {
  const l = vertical.toLowerCase()
  if (l.includes('media') || l.includes('entertainment') || l.includes('broadcast')) return 'media'
  if (l.includes('health') || l.includes('pharma') || l.includes('genomics') || l.includes('life')) return 'lifesciences'
  if (l.includes('research') || l.includes('national lab') || l.includes('university') || l.includes('higher ed')) return 'research'
  if (l.includes('financial') || l.includes('banking') || l.includes('insurance')) return 'finserv'
  if (l.includes('government') || l.includes('public safety') || l.includes('federal') || l.includes('state')) return 'government'
  if (l.includes('geospatial') || l.includes('mapping') || l.includes('gis')) return 'geospatial'
  if (l.includes('defense') || l.includes('aerospace') || l.includes('military')) return 'defense'
  if (l.includes('energy') || l.includes('oil') || l.includes('gas') || l.includes('utilit')) return 'energy'
  if (l.includes('semiconductor') || l.includes('chip') || l.includes('fab')) return 'semiconductor'
  return 'research'
}

function linkedinUrl(persona: string, company: string) {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(persona + ' ' + company)}`
}

export default function TerritoryPlan() {
  const [expandedAccount, setExpandedAccount] = useState<number | null>(null)
  const [researching, setResearching] = useState<Record<number, boolean>>({})
  const [deepDive, setDeepDive] = useState<Record<number, Intel>>({})
  const [copied, setCopied] = useState<string | null>(null)

  const [view, setView] = useState<'list' | 'map'>('list')

  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<Record<string, 'pending' | 'loading' | 'done' | 'error'>>({})
  const [importedAccounts, setImportedAccounts] = useState<Account[]>([])
  const [includeDefaults, setIncludeDefaults] = useState(true)

  const allAccounts = useMemo(() => {
    const base = includeDefaults ? DEFAULT_ACCOUNTS : []
    return [...base, ...importedAccounts].map((a, i) => ({ ...a, rank: i + 1 }))
  }, [includeDefaults, importedAccounts])

  const totalPipeline = allAccounts.reduce((s, a) => {
    const match = a.est_acv.match(/\$([0-9.]+)([KMB])/i)
    if (!match) return s
    const num = parseFloat(match[1])
    const mult = match[2].toUpperCase() === 'M' ? 1000000 : match[2].toUpperCase() === 'K' ? 1000 : 1
    return s + num * mult
  }, 0)

  const aiResearch = async (idx: number) => {
    const account = allAccounts[idx]
    setResearching(p => ({ ...p, [idx]: true }))
    try {
      const r = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: account.company }),
      })
      const d = await r.json()
      if (d.intel) {
        setDeepDive(p => ({ ...p, [idx]: d.intel as Intel }))
      }
    } catch {}
    setResearching(p => ({ ...p, [idx]: false }))
  }

  const parseImportLine = (line: string) => {
    const parts = line.split(',').map(s => s.trim())
    const company = parts[0]
    if (parts.length >= 3) {
      const city = parts[1]
      const stateChunk = parts.slice(2).join(', ').trim()
      const stateMatch = stateChunk.match(/^([A-Z]{2})(?:\s+\d{5})?$/i)
      const state = stateMatch ? stateMatch[1].toUpperCase() : stateChunk.replace(/\s*\d{5}$/, '').trim()
      return { company, city, state }
    }
    if (parts.length === 2) {
      return { company, city: parts[1], state: '' }
    }
    return { company, city: '', state: '' }
  }

  const importAccounts = async () => {
    const lines = importText.split('\n').map(s => s.trim()).filter(Boolean)
    if (!lines.length) return

    setImporting(true)
    const progress: Record<string, 'pending' | 'loading' | 'done' | 'error'> = {}
    lines.forEach(l => { progress[l] = 'pending' })
    setImportProgress({ ...progress })

    for (const line of lines) {
      const parsed = parseImportLine(line)
      setImportProgress(p => ({ ...p, [line]: 'loading' }))
      try {
        const r = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company: parsed.company }),
        })
        const d = await r.json()
        if (d.intel) {
          const intel = d.intel as Intel
          let city = parsed.city
          let state = parsed.state
          if (!city) {
            const apiParts = (intel.hq || '').split(',').map(s => s.trim())
            city = apiParts[0] || ''
            state = apiParts[1] || ''
          }
          const coords = lookupCoords(city)
          const newAccount: Account = {
            rank: 0,
            company: intel.company_name || parsed.company,
            vertical: intel.primary_vertical || 'Research',
            vertical_id: mapVerticalId(intel.primary_vertical || ''),
            revenue: '',
            hq_city: city,
            hq_state: state,
            lat: coords.lat,
            lng: coords.lng,
            data_challenge: intel.data_challenge || '',
            stardog_fit: intel.qumulo_fit || '',
            entry_strategy: intel.outreach_angle || '',
            key_personas: intel.target_contacts?.map(c => c.title) || [],
            est_acv: 'TBD',
          }
          setImportedAccounts(prev => [...prev, newAccount])
          setImportProgress(p => ({ ...p, [line]: 'done' }))
        } else {
          setImportProgress(p => ({ ...p, [line]: 'error' }))
        }
      } catch {
        setImportProgress(p => ({ ...p, [line]: 'error' }))
      }
    }
    setImporting(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Territory Attack Plan &mdash; AZ / NM / UT / CO Commercial</h2>
          <p className="text-sm text-slate-400">
            {allAccounts.length} pre-researched accounts in territory. Each has a visible incumbent at refresh, an unstructured-data signal, and a Qumulo wedge.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(p => !p)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              showImport
                ? 'bg-sherpa/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Import
          </button>

          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all ${
                view === 'list' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
            <button
              onClick={() => setView('map')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all ${
                view === 'map' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              Map
            </button>
          </div>
        </div>
      </div>

      {showImport && (
        <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Import Accounts</h3>
              <p className="text-xs text-slate-400 mt-0.5">Paste one entry per line. Company alone, or Company, City, ST.</p>
            </div>
            <button onClick={() => setShowImport(false)} className="p-1 text-slate-500 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          </div>

          <textarea
            value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder={'TGen, Phoenix, AZ\nMicron Technology, Lehi, UT\nNREL, Golden, CO'}
            rows={5}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 text-sm resize-none leading-relaxed"
          />

          <div className="flex items-center gap-4">
            <button
              onClick={importAccounts}
              disabled={importing || !importText.trim()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sherpa text-white font-medium text-sm hover:bg-[#005068] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? (
                <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Importing...</>
              ) : (
                <><Upload className="w-3.5 h-3.5" /> Import Accounts</>
              )}
            </button>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <button
                onClick={() => setIncludeDefaults(p => !p)}
                className={`relative w-9 h-5 rounded-full transition-colors ${includeDefaults ? 'bg-sherpa' : 'bg-white/10'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${includeDefaults ? 'translate-x-4' : ''}`} />
              </button>
              <span className="text-xs text-slate-400">Include default accounts</span>
            </label>
          </div>

          {Object.keys(importProgress).length > 0 && (
            <div className="space-y-1.5">
              {Object.entries(importProgress).map(([name, status]) => (
                <div key={name} className="flex items-center gap-2 text-xs">
                  {status === 'pending' && <div className="w-3.5 h-3.5 rounded-full border border-slate-600" />}
                  {status === 'loading' && <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
                  {status === 'done' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  {status === 'error' && <X className="w-3.5 h-3.5 text-red-400" />}
                  <span className={status === 'done' ? 'text-slate-300' : status === 'error' ? 'text-red-400' : 'text-slate-400'}>
                    {name}
                  </span>
                  {status === 'loading' && <span className="text-slate-500">Analyzing...</span>}
                  {status === 'error' && <span className="text-red-500">Failed</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-slate-400">Target Accounts</span>
          </div>
          <div className="text-2xl font-bold text-white">{allAccounts.length}</div>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-400">Pipeline (low band)</span>
          </div>
          <div className="text-2xl font-bold text-white">${(totalPipeline / 1000000).toFixed(1)}M</div>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4 text-violet-400" />
            <span className="text-xs text-slate-400">Verticals Covered</span>
          </div>
          <div className="text-2xl font-bold text-white">{new Set(allAccounts.map(a => a.vertical_id)).size}</div>
        </div>
      </div>

      {view === 'map' && (
        <TerritoryMap accounts={allAccounts} />
      )}

      {view === 'list' && (
        <div className="space-y-2">
          {allAccounts.map((a, idx) => {
            const isOpen = expandedAccount === idx
            return (
              <div key={`${a.company}-${idx}`} className="rounded-xl bg-white/[0.03] border border-white/10 overflow-hidden hover:border-white/20 transition-all">
                <button
                  onClick={() => setExpandedAccount(isOpen ? null : idx)}
                  className="w-full p-4 flex items-center gap-4 text-left"
                >
                  <span className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-slate-400">
                    {a.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-white">{a.company}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${VERTICAL_COLORS[a.vertical_id] || 'bg-white/5 text-slate-400'}`}>
                        {a.vertical}
                      </span>
                      {a.revenue && <span className="text-xs text-slate-500">{a.revenue}</span>}
                      {a.hq_city && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {a.hq_city}, {a.hq_state}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-mono text-emerald-400">{a.est_acv}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {isOpen && (
                  <div className="border-t border-white/10 p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                        <div className="text-[10px] uppercase tracking-wider text-red-400 mb-1">Incumbent Pain</div>
                        <p className="text-xs text-slate-300">{a.data_challenge}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-sherpa/5 border border-cyan-500/20">
                        <div className="text-[10px] uppercase tracking-wider text-cyan-400 mb-1">Qumulo Fit</div>
                        <p className="text-xs text-slate-300">{a.qumulo_fit}</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/10">
                      <div className="text-[10px] uppercase tracking-wider text-violet-400 mb-1">Entry Strategy</div>
                      <p className="text-xs text-slate-300">{a.entry_strategy}</p>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Key Personas</div>
                      <div className="flex flex-wrap gap-2">
                        {a.key_personas.map((p, i) => (
                          <a
                            key={i}
                            href={linkedinUrl(p, a.company)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 text-xs text-cyan-400 hover:bg-sherpa/10 hover:text-cyan-400 transition-all"
                          >
                            {p}
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </a>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => aiResearch(idx)}
                      disabled={researching[idx]}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sherpa/10 text-cyan-400 hover:bg-sherpa/20 transition-all text-xs font-medium"
                    >
                      {researching[idx] ? (
                        <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Researching...</>
                      ) : (
                        <><Sparkles className="w-3.5 h-3.5" /> AI Deep Dive</>
                      )}
                    </button>

                    {deepDive[idx] && (() => {
                      const intel = deepDive[idx]
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 rounded-full bg-white/10 overflow-hidden">
                                <div className="h-full rounded-full bg-sherpa" style={{ width: `${intel.relevance_score}%` }} />
                              </div>
                              <span className="text-xs text-cyan-400 font-mono">{intel.relevance_score}%</span>
                            </div>
                            <span className="text-[10px] text-slate-400">{intel.relevance_label}</span>
                            {intel.hq && <span className="text-[10px] text-slate-500">HQ: {intel.hq}</span>}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                              <div className="text-[10px] uppercase tracking-wider text-red-400 mb-1">Data Challenge</div>
                              <p className="text-xs text-slate-300">{intel.data_challenge}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-sherpa/5 border border-cyan-500/20">
                              <div className="text-[10px] uppercase tracking-wider text-cyan-400 mb-1">Qumulo Fit</div>
                              <p className="text-xs text-slate-300">{intel.qumulo_fit}</p>
                            </div>
                          </div>

                          <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/10">
                            <div className="text-[10px] uppercase tracking-wider text-violet-400 mb-1">Outreach Angle</div>
                            <p className="text-xs text-slate-300">{intel.outreach_angle}</p>
                          </div>

                          {intel.talking_points?.length > 0 && (
                            <div className="p-3 rounded-lg bg-white/5">
                              <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Talking Points</div>
                              <ul className="space-y-1">
                                {intel.talking_points.map((pt: string, pi: number) => (
                                  <li key={pi} className="flex items-start gap-2 text-xs text-slate-300">
                                    <span className="text-cyan-400 mt-0.5">&rarr;</span> {pt}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {intel.target_contacts?.length > 0 && (
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Target Contacts</div>
                              <div className="flex flex-wrap gap-2">
                                {intel.target_contacts.map((c: Contact, ci: number) => (
                                  <a key={ci} href={c.linkedin_search} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 text-xs text-cyan-400 hover:bg-sherpa/10 transition-all"
                                    title={c.why_target}>
                                    {c.title} <ExternalLink className="w-3 h-3 opacity-60" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {intel.risk_flags?.length > 0 && (
                            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                              <div className="text-[10px] uppercase tracking-wider text-amber-400 mb-1">Risk Factors</div>
                              <ul className="space-y-1">
                                {intel.risk_flags.map((rf: string, ri: number) => (
                                  <li key={ri} className="text-xs text-slate-400 flex items-start gap-2">
                                    <span className="text-amber-500 mt-0.5">!</span> {rf}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {intel.email_subject && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(`Subject: ${intel.email_subject}\n\n${intel.outreach_angle}`)
                                  setCopied(`dd-${idx}`)
                                  setTimeout(() => setCopied(null), 2000)
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-xs text-slate-300 hover:bg-white/10 transition-all"
                              >
                                {copied === `dd-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                {copied === `dd-${idx}` ? 'Copied' : 'Copy outreach'}
                              </button>
                              <span className="text-[10px] text-slate-500 truncate">Subject: {intel.email_subject}</span>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
