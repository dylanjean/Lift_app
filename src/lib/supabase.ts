import { createClient } from '@supabase/supabase-js'

// Fail loudly at startup rather than with a cryptic fetch error mid-session.
// Types come later: `supabase gen types typescript` once the schema exists
// (Milestone 1) — do not hand-write row types.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copy .env.example to .env.local and fill it in.',
  )
}

export const supabase = createClient(url, anonKey)
