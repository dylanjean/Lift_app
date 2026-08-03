import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Fail loudly at startup rather than with a cryptic fetch error mid-session.
// database.types.ts is generated — refresh after schema changes with:
//   pnpm supabase gen types typescript --linked > src/lib/database.types.ts
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copy .env.example to .env.local and fill it in.',
  )
}

export const supabase = createClient<Database>(url, anonKey)
