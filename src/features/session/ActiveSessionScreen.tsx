import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { elapsedSeconds, formatHMS, formatMS } from '../../lib/time'
import { useTick } from '../../lib/useTick'
import { useWakeLock } from '../../lib/useWakeLock'
import { PlateStack } from '../../components/PlateStack'
import { SetRow } from './SetRow'
import { SwapSheet } from './SwapSheet'
import type { LoggedSet, Slot, SlotExercise } from './queries'
import {
  useDiscardSession,
  useFinishSession,
  useLogSet,
  usePrevSets,
  useSessionDetail,
  useSessionSets,
} from './queries'

export function ActiveSessionScreen() {
  const { id } = useParams<{ id: string }>()
  if (!id) throw new Error('session route without id')
  return <Session sessionId={id} />
}

function Session({ sessionId }: { sessionId: string }) {
  const navigate = useNavigate()
  const detail = useSessionDetail(sessionId)
  const sets = useSessionSets(sessionId)
  const logSet = useLogSet()
  const [slotIndex, setSlotIndex] = useState<number | null>(null) // null until initial focus computed
  const [swapOpen, setSwapOpen] = useState(false)
  // Slot → chosen exercise for slots swapped this session but not yet logged.
  const [swapChoice, setSwapChoice] = useState<Record<string, SlotExercise>>({})
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null)

  useWakeLock(true)
  useTick(1000)

  const slots = detail.data?.slots
  const bySlot = useMemo(() => {
    const m = new Map<string, typeof sets.data>()
    for (const s of sets.data ?? []) {
      const arr = m.get(s.program_day_exercise_id) ?? []
      arr.push(s)
      m.set(s.program_day_exercise_id, arr)
    }
    return m
  }, [sets.data])

  // First visit: focus the first slot that still has work.
  useEffect(() => {
    if (slotIndex === null && slots && sets.data) {
      const idx = slots.findIndex((sl) => (bySlot.get(sl.id)?.length ?? 0) < sl.target_sets)
      setSlotIndex(idx === -1 ? slots.length - 1 : idx)
    }
  }, [slotIndex, slots, sets.data, bySlot])

  // Rest timer: computed from a timestamp so backgrounding can't skew it.
  const restLeft = restEndsAt === null ? null : Math.ceil((restEndsAt - Date.now()) / 1000)
  useEffect(() => {
    if (restLeft !== null && restLeft <= 0) {
      navigator.vibrate?.([200, 100, 200])
      setRestEndsAt(null)
    }
  }, [restLeft])

  if (detail.isPending || sets.isPending || slotIndex === null) {
    return <main className="min-h-dvh px-5 pt-4 font-sans" />
  }
  if (detail.isError) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-5 font-sans">
        <p className="text-sm text-plate-red">{detail.error.message}</p>
      </main>
    )
  }

  const { label, started_at, slots: allSlots } = detail.data
  const slot = allSlots[slotIndex]!
  const slotSets = bySlot.get(slot.id) ?? []
  // Exercise in effect: an explicit swap choice wins (must beat already-
  // logged sets or you couldn't swap mid-slot); after a reload the choice
  // map is empty and the last logged set's exercise reconstructs it; else
  // the plan.
  const lastLogged = slotSets[slotSets.length - 1]
  const currentExercise: SlotExercise =
    swapChoice[slot.id] ??
    (lastLogged && allExercise(allSlots, swapChoice, lastLogged.exercise_id)) ??
    slot.exercise
  const swapped = currentExercise.id !== slot.exercise.id
  const done = slotSets.length >= slot.target_sets

  return (
    <main className="flex min-h-dvh flex-col px-5 pt-4 pb-40 font-sans">
      {/* header */}
      <div className="mb-6 flex items-center justify-between">
        <button type="button" onClick={() => void navigate('/')} aria-label="back to today"
          className="-ml-2 flex h-11 w-11 items-center justify-center text-muted">
          ←
        </button>
        <span className="font-display text-sm font-bold tracking-wide uppercase">{label}</span>
        <span className="font-mono text-sm text-muted">{formatHMS(elapsedSeconds(started_at))}</span>
      </div>

      {/* slot header */}
      <div className="mb-1 flex items-center justify-between">
        <p className="font-mono text-xs text-muted">
          SLOT {slotIndex + 1}/{allSlots.length} · {slot.target_sets}×{slot.target_reps}
          {slot.rest_seconds ? ` · rest ${formatMS(slot.rest_seconds)}` : ''}
        </p>
        {done && <span className="font-mono text-xs text-plate-green">DONE</span>}
      </div>
      <div className="mb-1 flex items-start justify-between gap-2">
        <h1 className="font-display text-3xl font-black tracking-wide uppercase">{currentExercise.name}</h1>
        <button
          type="button"
          aria-label="swap exercise"
          onClick={() => setSwapOpen(true)}
          className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-raised text-lg"
        >
          ⇄
        </button>
      </div>
      {swapped && (
        <p className="mb-1 font-mono text-xs text-plate-yellow">SWAPPED · planned: {slot.exercise.name}</p>
      )}

      <PrevLine exerciseId={currentExercise.id} sessionId={sessionId} />

      {/* set rows */}
      <div className="mt-4 flex flex-col gap-2">
        <SlotSets
          key={`${slot.id}-${currentExercise.id}`}
          slot={slot}
          currentExercise={currentExercise}
          sessionId={sessionId}
          slotSets={slotSets}
          onLog={(setIndex, weight, reps, rpe) => {
            logSet.mutate({
              sessionId,
              slotId: slot.id,
              exerciseId: currentExercise.id,
              substitutedForId: swapped ? slot.exercise.id : null,
              setIndex,
              weight,
              reps,
              rpe,
            })
            const isLastOfSlot = setIndex >= slot.target_sets
            if (!isLastOfSlot || slotIndex < allSlots.length - 1) {
              if (slot.rest_seconds) setRestEndsAt(Date.now() + slot.rest_seconds * 1000)
            }
          }}
        />
      </div>

      {currentExercise.cues && <p className="mt-3 text-xs text-muted">{currentExercise.cues}</p>}

      {/* bottom: rest bar or slot nav + finish */}
      <div className="fixed inset-x-0 bottom-0 flex flex-col gap-2 bg-surface/95 px-5 pt-2 pb-6 backdrop-blur">
        {restLeft !== null && restLeft > 0 ? (
          <div className="flex h-16 items-center justify-between rounded-sm bg-plate-yellow px-4 text-surface">
            <span className="font-display text-sm font-bold">REST</span>
            <span className="font-mono text-3xl font-medium">{formatMS(restLeft)}</span>
            <button type="button" onClick={() => setRestEndsAt(null)}
              className="h-11 rounded-sm px-3 font-display text-sm font-bold">
              SKIP
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <NavBtn label="‹ PREV" disabled={slotIndex === 0} onClick={() => { setSlotIndex(slotIndex - 1); setSwapOpen(false) }} />
            <NavBtn label="NEXT ›" disabled={slotIndex === allSlots.length - 1} onClick={() => { setSlotIndex(slotIndex + 1); setSwapOpen(false) }} />
          </div>
        )}
        <FinishRow sessionId={sessionId} startedAt={started_at} anySets={(sets.data?.length ?? 0) > 0} />
      </div>

      {swapOpen && (
        <SwapSheet
          planned={slot.exercise}
          current={currentExercise}
          onClose={() => setSwapOpen(false)}
          onSelect={(e) => {
            setSwapChoice((m) => ({ ...m, [slot.id]: e }))
            setSwapOpen(false)
          }}
        />
      )}
    </main>
  )
}

/** Resolve an exercise id to its details from any slot's plan or swap choices. */
function allExercise(
  slots: Slot[],
  choices: Record<string, SlotExercise>,
  exerciseId: string,
): SlotExercise | undefined {
  for (const s of slots) if (s.exercise.id === exerciseId) return s.exercise
  for (const c of Object.values(choices)) if (c.id === exerciseId) return c
  return undefined
}

function SlotSets({
  slot,
  currentExercise,
  sessionId,
  slotSets,
  onLog,
}: {
  slot: Slot
  currentExercise: SlotExercise
  sessionId: string
  slotSets: LoggedSet[]
  onLog: (setIndex: number, weight: number, reps: number, rpe: number | null) => void
}) {
  const prev = usePrevSets(currentExercise.id, sessionId)
  const rows = Array.from({ length: slot.target_sets }, (_, i) => i + 1)
  // Suggestions come only from sets of the exercise currently in effect —
  // after a swap, the planned lift's weights are the wrong hint (§6).
  const lastLogged = slotSets.filter((s) => s.exercise_id === currentExercise.id).at(-1)
  // the weight you're about to put on the bar
  const workingWeight = lastLogged?.weight ?? prev.data?.[prev.data.length - 1]?.weight

  return (
    <>
      {currentExercise.equipment === 'barbell' && workingWeight !== undefined && (
        <PlateStack weight={workingWeight} className="mb-1" />
      )}
      {rows.map((setIndex) => {
        const logged = slotSets.find((s) => s.set_index === setIndex)
        const prevSame = prev.data?.find((p) => p.set_index === setIndex)
        const prevLast = prev.data?.[prev.data.length - 1]
        const suggestion = {
          // this session's last set beats history; history beats nothing
          weight: lastLogged?.weight ?? prevSame?.weight ?? prevLast?.weight ?? null,
          reps: prevSame?.reps ?? lastLogged?.reps ?? prevLast?.reps ?? null,
          rpe: null,
        }
        return (
          <SetRow
            key={setIndex}
            setIndex={setIndex}
            targetReps={slot.target_reps}
            logged={logged}
            suggestion={suggestion}
            onLog={(w, r, rpe) => onLog(setIndex, w, r, rpe)}
          />
        )
      })}
    </>
  )
}

function PrevLine({ exerciseId, sessionId }: { exerciseId: string; sessionId: string }) {
  const prev = usePrevSets(exerciseId, sessionId)
  if (prev.isPending) return <p className="font-mono text-xs text-muted">…</p>
  if (!prev.data || prev.data.length === 0)
    return <p className="font-mono text-xs text-muted">first time — no history</p>
  return (
    <p className="font-mono text-xs text-muted">
      last: {prev.data.map((s) => `${s.weight}×${s.reps}`).join('  ')}
    </p>
  )
}

function NavBtn({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-14 flex-1 rounded-sm border border-raised bg-raised font-display text-sm font-bold text-ink disabled:opacity-30"
    >
      {label}
    </button>
  )
}

function FinishRow({ sessionId, startedAt, anySets }: { sessionId: string; startedAt: string; anySets: boolean }) {
  const navigate = useNavigate()
  const finish = useFinishSession(sessionId, startedAt)
  const discard = useDiscardSession(sessionId)

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => {
          if (window.confirm('Discard this workout? Logged sets are deleted.')) {
            discard.mutate(undefined, { onSuccess: () => void navigate('/') })
          }
        }}
        className="h-14 rounded-sm border border-raised px-4 font-display text-sm font-bold text-plate-red"
      >
        DISCARD
      </button>
      <button
        type="button"
        disabled={finish.isPending}
        onClick={() => {
          if (anySets || window.confirm('No sets logged — finish anyway?')) {
            finish.mutate(undefined, { onSuccess: () => void navigate('/') })
          }
        }}
        className="h-14 flex-1 rounded-sm bg-plate-blue font-display text-base font-bold tracking-wide text-plate-white disabled:opacity-60"
      >
        FINISH WORKOUT
      </button>
    </div>
  )
}
