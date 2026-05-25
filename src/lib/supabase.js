import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// ── Supabase client ───────────────────────────────────────────────────────────
// Only created when credentials are present; null otherwise (demo/offline mode).
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// ── Environment helpers ───────────────────────────────────────────────────────
// VITE_APP_ENV is set in each .env.[mode] file.
// Falls back to Vite's built-in MODE when the variable is not defined.
export const APP_ENV   = import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'development'
export const APP_NAME  = import.meta.env.VITE_APP_NAME || 'KIUVO CRM'

export const isDev     = APP_ENV === 'development'
export const isStaging = APP_ENV === 'staging'
export const isProd    = APP_ENV === 'production'

/** True when mock data fallback is allowed (set VITE_MOCK_FALLBACK=true in env). */
export const mockFallback = import.meta.env.VITE_MOCK_FALLBACK === 'true'

/** Debug query logging — only active when VITE_DEBUG_QUERIES=true */
export const debugQueries = import.meta.env.VITE_DEBUG_QUERIES === 'true'

// Optional Supabase query logger for development
if (debugQueries && isSupabaseConfigured) {
  console.info(`[supabase] Connected to ${supabaseUrl} (${APP_ENV})`)
}
