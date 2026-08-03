import { useNavigate } from 'react-router'
import { elapsedSeconds, formatHMS } from '../../lib/time'
import { useTick } from '../../lib/useTick'
import { useActiveFast, useEndFast, useStartFast } from './queries'

/**
 * Fast timer — a stored started_at and render-time math, nothing else.
 * No interval survives backgrounding on Android and none needs to: after
 * eight hours asleep the first render recomputes from the timestamp
 * (CLAUDE.md §6 acceptance test).
 */
export function FastScreen() {
  const navigate = useNavigate()
  const fast = useActiveFast()
  const start = useStartFast()
  const end = useEndFast()

  useTick(1000, Boolean(fast.data))

  if (fast.isPending) return <main className="min-h-dvh font-sans" />

  const active = fast.data
  const elapsed = active ? elapsedSeconds(active.started_at) : 0
  const targetSeconds = active ? active.target_hours * 3600 : 16 * 3600
  const progress = Math.min(1, elapsed / targetSeconds)
  const hit = active !== null && elapsed >= targetSeconds

  // ring geometry: r=88 in a 200-box, stroke offset drives progress
  const C = 2 * Math.PI * 88

  return (
    <main className="flex min-h-dvh flex-col px-5 pt-4 pb-8 font-sans">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={() => void navigate('/')} aria-label="back to today"
          className="-ml-2 flex h-11 w-11 items-center justify-center text-muted">
          ←
        </button>
        <span className="font-display text-sm font-bold tracking-wide uppercase">Fast</span>
        <span className="w-11" aria-hidden />
      </div>

      <div className="relative mx-auto flex w-full max-w-xs flex-1 items-center justify-center">
        <svg viewBox="0 0 200 200" className="w-full -rotate-90" aria-hidden>
          <circle cx="100" cy="100" r="88" fill="none" strokeWidth="6" className="stroke-raised" />
          {active && (
            <circle
              cx="100" cy="100" r="88" fill="none" strokeWidth="6" strokeLinecap="butt"
              strokeDasharray={C} strokeDashoffset={C * (1 - progress)}
              className={hit ? 'stroke-plate-green' : 'stroke-plate-yellow'}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span className="font-mono text-4xl font-medium">{formatHMS(elapsed)}</span>
          {active ? (
            <span className={`font-mono text-xs ${hit ? 'text-plate-green' : 'text-muted'}`}>
              {hit ? 'TARGET HIT' : `of ${active.target_hours}h target`}
            </span>
          ) : (
            <span className="font-mono text-xs text-muted">no active fast</span>
          )}
        </div>
      </div>

      {active ? (
        <button
          type="button"
          disabled={end.isPending}
          onClick={() => end.mutate(active.id)}
          className="h-16 rounded-sm border border-raised bg-raised font-display text-lg font-bold tracking-wide text-ink disabled:opacity-60"
        >
          END FAST
        </button>
      ) : (
        <button
          type="button"
          disabled={start.isPending}
          onClick={() => start.mutate()}
          className="h-16 rounded-sm bg-plate-blue font-display text-lg font-bold tracking-wide text-plate-white disabled:opacity-60"
        >
          START 16:8 FAST
        </button>
      )}
    </main>
  )
}
