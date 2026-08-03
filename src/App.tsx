import { supabase } from './lib/supabase'
import { useSession } from './features/auth/useSession'
import { SignIn } from './features/auth/SignIn'

function App() {
  const session = useSession()

  // Restoring persisted session — render nothing to avoid a sign-in flash.
  if (session === undefined) return null

  if (session === null) return <SignIn />

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 font-sans">
      <h1 className="font-display text-2xl font-bold tracking-wide">PPL TRACKER</h1>
      <p className="text-sm text-muted">Signed in as {session.user.email}</p>
      <p className="text-sm text-plate-green">Milestone 0 complete</p>
      <button
        type="button"
        onClick={() => void supabase.auth.signOut()}
        className="mt-8 h-14 min-w-40 rounded-sm border border-raised bg-raised px-6 text-sm text-muted"
      >
        Sign out
      </button>
    </main>
  )
}

export default App
