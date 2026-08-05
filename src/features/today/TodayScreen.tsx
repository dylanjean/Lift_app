import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { nextDayIndex } from '../../lib/rotation'
import { DAILY_GOAL_OZ, mlToOz } from '../../lib/water'
import { elapsedSeconds, formatHMS } from '../../lib/time'
import { useTick } from '../../lib/useTick'
import { useActiveFast } from '../fast/queries'
import { useSessionSummaries } from '../history/queries'
import { HelpButton, HelpItem } from '../../components/HelpButton'
import { WaterQuickAdd } from './WaterQuickAdd'
import {
  useActiveSession,
  useLastCompletedDayIndex,
  useProgramDays,
  useStartSession,
  useTodayWaterMl,
} from './queries'

export function TodayScreen() {
  const navigate = useNavigate()
  const days = useProgramDays()
  const lastDay = useLastCompletedDayIndex()
  const active = useActiveSession()
  const recent = useSessionSummaries(10)
  const startSession = useStartSession()
  const waterMl = useTodayWaterMl()
  const fast = useActiveFast()
  // null = follow the rotation's suggestion; a number = manual override
  const [pickedIdx, setPickedIdx] = useState<number | null>(null)

  useTick(1000, Boolean(fast.data))

  if (days.isPending || lastDay.isPending || active.isPending) {
    return <Shell />
  }
  if (days.isError || !days.data.length) {
    return (
      <Shell>
        <p className="text-sm text-plate-red">
          {days.isError ? days.error.message : 'No program found — run the seed loader.'}
        </p>
      </Shell>
    )
  }

  const suggestedIdx = nextDayIndex(lastDay.data ?? null, days.data.length)
  const selectedIdx = pickedIdx ?? suggestedIdx
  const selected = days.data[selectedIdx]!
  const activeSession = active.data
  const waterOz = mlToOz(waterMl.data ?? 0)

  /** most recent completed session per day label, for the "last done" hints */
  const lastByLabel = new Map<string, string>()
  for (const s of recent.data ?? []) {
    if (s.label && s.started_at && !lastByLabel.has(s.label)) lastByLabel.set(s.label, s.started_at)
  }

  function handlePrimary() {
    if (activeSession) {
      void navigate(`/session/${activeSession.id}`)
    } else {
      startSession.mutate(selected.id, {
        onSuccess: (s) => void navigate(`/session/${s.id}`),
      })
    }
  }

  return (
    <Shell>
      {/* status row */}
      <div className="flex items-center justify-between font-mono text-xs text-muted">
        <span>
          {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
        <Link to="/fast" className="flex h-11 items-center">
          {fast.data ? (
            <span className="text-plate-yellow">
              FASTING {formatHMS(elapsedSeconds(fast.data.started_at))}
            </span>
          ) : (
            <span>NO FAST ›</span>
          )}
        </Link>
      </div>

      {/* day picker — suggestion pre-selected, tap to override */}
      <div>
        <p className="mb-2 font-mono text-xs text-muted">
          {activeSession ? 'WORKOUT IN PROGRESS' : 'NEXT WORKOUT'}
        </p>
        <div className="flex gap-2">
          {days.data.map((d, i) => {
            const isSelected = !activeSession && i === selectedIdx
            const isActive = activeSession?.program_day_id === d.id
            const last = lastByLabel.get(d.label)
            return (
              <button
                key={d.id}
                type="button"
                disabled={Boolean(activeSession)}
                onClick={() => setPickedIdx(i)}
                className={`flex h-24 flex-1 flex-col items-center justify-center gap-1 rounded-sm border ${
                  isSelected || isActive
                    ? 'border-plate-blue bg-raised'
                    : 'border-raised disabled:opacity-40'
                }`}
              >
                <span
                  className={`font-display text-lg font-black tracking-wide uppercase ${
                    isSelected || isActive ? 'text-ink' : 'text-muted'
                  }`}
                >
                  {d.label}
                </span>
                <span className="font-mono text-[10px] text-muted">
                  {i === suggestedIdx && !activeSession
                    ? 'UP NEXT'
                    : last
                      ? daysAgo(last)
                      : '—'}
                </span>
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-sm text-muted">
          {selected.slotCount} exercises
          {pickedIdx !== null && pickedIdx !== suggestedIdx && !activeSession && (
            <span className="text-plate-yellow"> · off rotation</span>
          )}
        </p>
      </div>

      {/* recent workouts */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between font-mono text-xs">
          <span className="text-muted">RECENT</span>
          <div className="flex gap-5">
            <Link to="/progress" className="flex h-11 items-center text-muted">PROGRESS ›</Link>
            <Link to="/history" className="flex h-11 items-center text-muted">ALL ›</Link>
          </div>
        </div>
        <div className="flex flex-col gap-2 overflow-y-auto">
          {recent.data?.slice(0, 3).map((s) => (
            <div key={s.session_id} className="flex h-13 items-center justify-between rounded-sm border border-raised px-3 py-2">
              <div className="flex items-baseline gap-3">
                <span className="w-12 font-display text-sm font-bold tracking-wide uppercase">{s.label}</span>
                <span className="font-mono text-xs text-muted">
                  {s.started_at &&
                    new Date(s.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div className="flex items-baseline gap-3 font-mono text-xs text-muted">
                <span>
                  <span className="text-ink">{Math.round(Number(s.volume)).toLocaleString()}</span> lb
                </span>
                <span>
                  <span className="text-ink">{s.sets}</span> sets
                </span>
                {(s.swaps ?? 0) > 0 && <span className="text-plate-yellow">{s.swaps}⇄</span>}
              </div>
            </div>
          ))}
          {recent.data?.length === 0 && (
            <p className="py-4 text-center text-sm text-muted">No workouts yet — first one's below.</p>
          )}
        </div>
      </div>

      {/* bottom third: water + primary action */}
      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm text-muted">Water</span>
            <span className="font-mono text-sm">
              <span className={waterOz >= DAILY_GOAL_OZ ? 'text-plate-green' : 'text-ink'}>{waterOz}</span>
              <span className="text-muted"> / {DAILY_GOAL_OZ} oz</span>
            </span>
          </div>
          <div className="mb-3 h-1 overflow-hidden rounded-sm bg-raised">
            <div
              className={`h-full ${waterOz >= DAILY_GOAL_OZ ? 'bg-plate-green' : 'bg-plate-blue'}`}
              style={{ width: `${Math.min(100, (waterOz / DAILY_GOAL_OZ) * 100)}%` }}
            />
          </div>
          <WaterQuickAdd />
        </div>

        <button
          type="button"
          onClick={handlePrimary}
          disabled={startSession.isPending}
          className="h-16 rounded-sm bg-plate-blue font-display text-lg font-bold tracking-wide text-plate-white disabled:opacity-60"
        >
          {activeSession ? 'RESUME WORKOUT' : `START ${selected.label.toUpperCase()}`}
        </button>
      </div>

      <HelpButton title="How this screen works">
        <HelpItem term="NEXT WORKOUT">
          the highlighted day is what the Push → Pull → Legs rotation says is next. Tap a different
          day to do it instead — the big button always names what it will start.
        </HelpItem>
        <HelpItem term="UP NEXT / 3D AGO">
          under each day: whether it's the rotation's suggestion, or how long since you last did it.
        </HelpItem>
        <HelpItem term="RECENT">
          your last three workouts — total pounds lifted, sets logged, and ⇄ marks sets done on a
          substitute exercise.
        </HelpItem>
        <HelpItem term="Water">
          tap a button to log a drink. Hold any button half a second for a custom amount.
        </HelpItem>
        <HelpItem term="FASTING">
          top-right shows the running fast timer; tap it to start or end a fast.
        </HelpItem>
      </HelpButton>
    </Shell>
  )
}

function daysAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days === 0) return 'TODAY'
  if (days === 1) return '1D AGO'
  return `${days}D AGO`
}

function Shell({ children }: { children?: React.ReactNode }) {
  return <main className="flex min-h-dvh flex-col gap-5 px-5 pt-4 pb-8 font-sans">{children}</main>
}
