import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

// Single-account app: no sign-up flow. The account is created once in the
// Supabase dashboard (Authentication → Users → Add user).
export function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setBusy(false)
  }

  return (
    <main className="flex min-h-dvh flex-col justify-end px-6 pb-16 font-sans">
      <h1 className="mb-10 font-display text-3xl font-bold tracking-wide">
        PPL TRACKER
      </h1>

      {/* Form sits in the bottom third — thumb reach, per the brief. */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Email
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-14 rounded-sm border border-raised bg-raised px-4 text-base text-ink outline-none focus-visible:border-plate-blue"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-14 rounded-sm border border-raised bg-raised px-4 text-base text-ink outline-none focus-visible:border-plate-blue"
          />
        </label>

        {error && <p className="text-sm text-plate-red">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-2 h-14 rounded-sm bg-plate-blue font-display text-base font-bold tracking-wide text-plate-white disabled:opacity-60"
        >
          {busy ? 'SIGNING IN…' : 'SIGN IN'}
        </button>
      </form>
    </main>
  )
}
