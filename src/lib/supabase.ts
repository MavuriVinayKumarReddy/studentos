import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** True when both public Supabase env vars are present. Never uses service role. */
export const isSupabaseConfigured = Boolean(
  url &&
    anonKey &&
    url.length > 0 &&
    anonKey.length > 0 &&
    !url.includes('your-project') &&
    anonKey !== 'your-anon-key',
)

let client: SupabaseClient | null = null

/**
 * Browser Supabase client (anon key only).
 * Returns null when cloud sync is not configured.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}

/** Convenience export — may be null when running fully offline/local. */
export const supabase = isSupabaseConfigured ? getSupabase() : null
