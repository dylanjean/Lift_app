import { Link, useNavigate } from 'react-router'
import { nextDayIndex } from '../../lib/rotation'
import { DAILY_GOAL_OZ, mlToOz } from '../../lib/water'
import { elapsedSeconds, formatHMS } from '../../lib/time'
import { useTick } from '../../lib/useTick'
import { useActiveFast } from '../fast/queries'
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
  const startSession = useStartSession()
  const waterMl = useTodayWaterMl()
  const fast = useActiveFast()

  useTick(1000, Boolean(fast.data)) // fast chip re-renders each second only while fasting

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

  const upNext = days.data[nextDayIndex(lastDay.data ?? null, days.data.length)]!
  const activeSession = active.data
  const waterOz = mlToOz(waterMl.data ?? 0)

  function handlePrimary() {
    if (activeSession) {
      void navigate(`/session/${activeSession.id}`)
    } else {
      startSession.mutate(upNext.id, {
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

      {/* the day in focus */}
      <div className="flex flex-1 flex-col justify-center">
        <p className="text-sm text-muted">
          {activeSession ? 'In progress' : 'Up next'} · day {(activeSession ? days.data.find((d) => d.id === activeSession.program_day_id) ?? upNext : upNext).day_index + 1} of {days.data.length}
        </p>
        <h1 className="font-display text-6xl font-black tracking-wide uppercase">
          {activeSession ? activeSession.program_day.label : upNext.label}
        </h1>
        <p className="mt-1 text-sm text-muted">{upNext.slotCount} exercises</p>
      </div>

      {/* bottom third: water + primary action */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-6 font-mono text-xs">
          <Link to="/progress" className="flex h-11 items-center text-muted">PROGRESS ›</Link>
          <Link to="/history" className="flex h-11 items-center text-muted">HISTORY ›</Link>
        </div>
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
          {activeSession ? 'RESUME WORKOUT' : 'START WORKOUT'}
        </button>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children?: React.ReactNode }) {
  return <main className="flex min-h-dvh flex-col gap-6 px-5 pt-4 pb-8 font-sans">{children}</main>
}
