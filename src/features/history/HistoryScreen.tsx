import { useNavigate } from 'react-router'
import { formatMS } from '../../lib/time'
import { useSessionSummaries } from './queries'

export function HistoryScreen() {
  const navigate = useNavigate()
  const sessions = useSessionSummaries()

  return (
    <main className="flex min-h-dvh flex-col gap-4 px-5 pt-4 pb-8 font-sans">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => void navigate('/')} aria-label="back to today"
          className="-ml-2 flex h-11 w-11 items-center justify-center text-muted">
          ←
        </button>
        <span className="font-display text-sm font-bold tracking-wide uppercase">History</span>
        <span className="w-11" aria-hidden />
      </div>

      {sessions.isPending && <p className="py-16 text-center text-sm text-muted">…</p>}
      {sessions.isError && (
        <p className="py-16 text-center text-sm text-plate-red">{sessions.error.message}</p>
      )}
      {sessions.data?.length === 0 && (
        <p className="py-16 text-center text-sm text-muted">No completed workouts yet.</p>
      )}

      <div className="flex flex-col gap-2">
        {sessions.data?.map((s) => (
          <div key={s.session_id} className="rounded-sm border border-raised px-4 py-3">
            <div className="flex items-baseline justify-between">
              <span className="font-display text-base font-bold tracking-wide uppercase">{s.label}</span>
              <span className="font-mono text-xs text-muted">
                {s.started_at &&
                  new Date(s.started_at).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
              </span>
            </div>
            <div className="mt-1 flex gap-4 font-mono text-xs text-muted">
              <span>
                <span className="text-ink">{Math.round(Number(s.volume)).toLocaleString()}</span> lb vol
              </span>
              <span>
                <span className="text-ink">{s.sets}</span> sets
              </span>
              {s.active_seconds !== null && s.active_seconds !== undefined && (
                <span>
                  <span className="text-ink">{formatMS(s.active_seconds)}</span> min
                </span>
              )}
              {(s.swaps ?? 0) > 0 && <span className="text-plate-yellow">{s.swaps} swapped</span>}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
