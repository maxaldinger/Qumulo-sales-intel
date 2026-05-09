/**
 * US-state lookup used by the Territory Plan import box. The import textarea
 * accepts state names ("Washington", "Colorado", "WA", "Washington, WA") and,
 * on match, sets a state filter on the displayed accounts instead of treating
 * the line as a fake company name.
 */

export const US_STATES: Array<{ name: string; abbr: string }> = [
  { name: 'Alabama',        abbr: 'AL' },
  { name: 'Alaska',         abbr: 'AK' },
  { name: 'Arizona',        abbr: 'AZ' },
  { name: 'Arkansas',       abbr: 'AR' },
  { name: 'California',     abbr: 'CA' },
  { name: 'Colorado',       abbr: 'CO' },
  { name: 'Connecticut',    abbr: 'CT' },
  { name: 'Delaware',       abbr: 'DE' },
  { name: 'Florida',        abbr: 'FL' },
  { name: 'Georgia',        abbr: 'GA' },
  { name: 'Hawaii',         abbr: 'HI' },
  { name: 'Idaho',          abbr: 'ID' },
  { name: 'Illinois',       abbr: 'IL' },
  { name: 'Indiana',        abbr: 'IN' },
  { name: 'Iowa',           abbr: 'IA' },
  { name: 'Kansas',         abbr: 'KS' },
  { name: 'Kentucky',       abbr: 'KY' },
  { name: 'Louisiana',      abbr: 'LA' },
  { name: 'Maine',          abbr: 'ME' },
  { name: 'Maryland',       abbr: 'MD' },
  { name: 'Massachusetts',  abbr: 'MA' },
  { name: 'Michigan',       abbr: 'MI' },
  { name: 'Minnesota',      abbr: 'MN' },
  { name: 'Mississippi',    abbr: 'MS' },
  { name: 'Missouri',       abbr: 'MO' },
  { name: 'Montana',        abbr: 'MT' },
  { name: 'Nebraska',       abbr: 'NE' },
  { name: 'Nevada',         abbr: 'NV' },
  { name: 'New Hampshire',  abbr: 'NH' },
  { name: 'New Jersey',     abbr: 'NJ' },
  { name: 'New Mexico',     abbr: 'NM' },
  { name: 'New York',       abbr: 'NY' },
  { name: 'North Carolina', abbr: 'NC' },
  { name: 'North Dakota',   abbr: 'ND' },
  { name: 'Ohio',           abbr: 'OH' },
  { name: 'Oklahoma',       abbr: 'OK' },
  { name: 'Oregon',         abbr: 'OR' },
  { name: 'Pennsylvania',   abbr: 'PA' },
  { name: 'Rhode Island',   abbr: 'RI' },
  { name: 'South Carolina', abbr: 'SC' },
  { name: 'South Dakota',   abbr: 'SD' },
  { name: 'Tennessee',      abbr: 'TN' },
  { name: 'Texas',          abbr: 'TX' },
  { name: 'Utah',           abbr: 'UT' },
  { name: 'Vermont',        abbr: 'VT' },
  { name: 'Virginia',       abbr: 'VA' },
  { name: 'Washington',     abbr: 'WA' },
  { name: 'West Virginia',  abbr: 'WV' },
  { name: 'Wisconsin',      abbr: 'WI' },
  { name: 'Wyoming',        abbr: 'WY' },
  { name: 'District of Columbia', abbr: 'DC' },
]

/**
 * Build a normalized lookup once at module load. Keys are lowercased, trimmed
 * of all whitespace and punctuation, so "Washington, WA" / "washington wa" /
 * "WA" / "washington" all collide on the same entry.
 */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, '')
}

const LOOKUP: Map<string, string> = (() => {
  const m = new Map<string, string>()
  for (const { name, abbr } of US_STATES) {
    m.set(normalize(name), abbr)
    m.set(normalize(abbr), abbr)
    m.set(normalize(`${name}${abbr}`), abbr) // "Washington, WA"
    m.set(normalize(`${name},${abbr}`), abbr)
  }
  return m
})()

/**
 * Resolve an arbitrary user input to a state abbreviation, or null if the
 * input does not unambiguously identify a state.
 *
 * Examples:
 *   "Washington"      → "WA"
 *   "  washington  "  → "WA"
 *   "WA"              → "WA"
 *   "Washington, WA"  → "WA"
 *   "New Mexico"      → "NM"
 *   "JPMorgan Chase"  → null
 */
export function resolveStateFilter(input: string): string | null {
  if (!input) return null
  const key = normalize(input)
  if (!key) return null
  return LOOKUP.get(key) ?? null
}

const ABBR_TO_NAME: Record<string, string> = Object.fromEntries(
  US_STATES.map(({ name, abbr }) => [abbr, name])
)

export function stateAbbrToName(abbr: string): string {
  return ABBR_TO_NAME[abbr] ?? abbr
}
