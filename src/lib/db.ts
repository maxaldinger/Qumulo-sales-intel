import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null
let _clientUrl: string | null = null

export function getDb(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!url || !key) {
    // Don't cache a broken state — force retry on next call
    _client = null
    _clientUrl = null
    console.error('[db] getDb() called with missing env vars:', {
      NEXT_PUBLIC_SUPABASE_URL: url ? `set (${url.length} chars, starts ${url.slice(0, 20)}...)` : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: key ? `set (${key.length} chars)` : 'MISSING',
    })
    throw new Error(`Supabase env vars not available: url=${!!url} key=${!!key}`)
  }

  // Recreate if URL changed (env var rotation) or not yet created
  if (!_client || _clientUrl !== url) {
    console.log('[db] Creating Supabase client for:', url.slice(0, 30) + '...')
    _client = createClient(url, key)
    _clientUrl = url
  }

  return _client
}

export const FEED_TTL_HOURS = 12
export const INTEL_TTL_HOURS = 24
