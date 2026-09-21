import { useState } from 'react'
import { useNavigate } from 'react-router'
import { HelpButton, HelpItem } from '../../components/HelpButton'
import { ExercisePicker } from './ExercisePicker'
import { TargetsSheet } from './TargetsSheet'
import type { EditorSlot } from './queries'
import {
  useAddSlot,
  useEditorDays,
  useMoveSlot,
  useRemoveSlot,
  useReplaceSlotExercise,
  useUpdateSlotTargets,
} from './queries'

type SheetState =
  | { kind: 'none' }
  | { kind: 'replace'; slot: EditorSlot }
  | { kind: 'targets'; slot: EditorSlot }
  | { kind: 'add-pick' }
  | { kind: 'add-targets'; exerciseId: string; exerciseName: string }

/**
 * Program editor — permanent changes to the plan, as opposed to the
 * in-session ⇄ swap which is a one-day substitution. Archive lands once
 * migration 0004 is pushed.
 */
export function ProgramScreen() {
  const navigate = useNavigate()
  const days = useEditorDays()
  const [dayIdx, setDayIdx] = useState(0)
  const [sheet, setSheet] = useState<SheetState>({ kind: 'none' })
  const replace = useReplaceSlotExercise()
  const targets = useUpdateSlotTargets()
  const move = useMoveSlot()
  const add = useAddSlot()
  const remove = useRemoveSlot()

  const day = days.data?.[dayIdx]
  const busy =
    replace.isPending || targets.isPending || move.isPending || add.isPending || remove.isPending

  return (
    <main className="flex min-h-dvh flex-col gap-4 px-5 pt-4 pb-8 font-sans">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => void navigate('/')} aria-label="back to today"
          className="-ml-2 flex h-11 w-11 items-center justify-center text-muted">
          ←
        </button>
        <span className="font-display text-sm font-bold tracking-wide uppercase">Program</span>
        <span className="w-11" aria-hidden />
      </div>

      {/* day tabs */}
      <div className="flex gap-2">
        {days.data?.map((d, i) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDayIdx(i)}
            className={`h-11 flex-1 rounded-sm border font-display text-sm font-bold tracking-wide uppercase ${
              i === dayIdx ? 'border-plate-blue text-ink' : 'border-raised text-muted'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {days.isError && <p className="text-sm text-plate-red">{days.error.message}</p>}

      {/* slot list */}
      <div className="flex flex-col gap-2">
        {day?.slots.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 rounded-sm border border-raised px-3 py-2">
            <button
              type="button"
              onClick={() => setSheet({ kind: 'replace', slot: s })}
              className="flex min-h-11 flex-1 flex-col items-start text-left"
            >
              <span className="text-base text-ink">{s.exercise.name}</span>
              <span className="font-mono text-xs text-muted">{s.exercise.primary_muscle ?? '—'}</span>
            </button>
            <button
              type="button"
              onClick={() => setSheet({ kind: 'targets', slot: s })}
              className="h-11 rounded-sm border border-raised px-2 font-mono text-xs text-ink"
            >
              {s.target_sets}×{s.target_reps}
            </button>
            <div className="flex flex-col">
              <button
                type="button"
                aria-label={`move ${s.exercise.name} up`}
                disabled={busy || i === 0}
                onClick={() => day && move.mutate({ a: day.slots[i - 1]!, b: s })}
                className="flex h-6 w-11 items-center justify-center text-muted disabled:opacity-30"
              >
                ▲
              </button>
              <button
                type="button"
                aria-label={`move ${s.exercise.name} down`}
                disabled={busy || i === day.slots.length - 1}
                onClick={() => day && move.mutate({ a: s, b: day.slots[i + 1]! })}
                className="flex h-6 w-11 items-center justify-center text-muted disabled:opacity-30"
              >
                ▼
              </button>
            </div>
            <button
              type="button"
              aria-label={`remove ${s.exercise.name}`}
              disabled={busy}
              onClick={() => {
                if (window.confirm(`Remove ${s.exercise.name} from ${day.label} day? Logged history stays in your charts.`)) {
                  remove.mutate(s.id)
                }
              }}
              className="flex h-11 w-8 items-center justify-center text-muted disabled:opacity-30"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      {remove.isError && <p className="text-xs text-plate-red">{remove.error.message}</p>}

      <button
        type="button"
        disabled={busy || !day}
        onClick={() => setSheet({ kind: 'add-pick' })}
        className="h-14 rounded-sm border border-raised bg-raised font-display text-sm font-bold tracking-wide text-ink disabled:opacity-40"
      >
        + ADD EXERCISE
      </button>

      <p className="text-xs text-muted">
        Changes here are permanent plan edits — history from replaced exercises stays on the slot,
        so charts remain continuous. For a one-day substitution use ⇄ during the workout instead.
      </p>

      {sheet.kind === 'replace' && (
        <ExercisePicker
          title={`Replace ${sheet.slot.exercise.name}`}
          excludeId={sheet.slot.exercise.id}
          onClose={() => setSheet({ kind: 'none' })}
          onSelect={(e) => {
            replace.mutate({ slotId: sheet.slot.id, exerciseId: e.id })
            setSheet({ kind: 'none' })
          }}
        />
      )}

      {sheet.kind === 'targets' && (
        <TargetsSheet
          title={`${sheet.slot.exercise.name} targets`}
          initialSets={sheet.slot.target_sets}
          initialReps={sheet.slot.target_reps}
          onClose={() => setSheet({ kind: 'none' })}
          onSave={(sets, reps) => {
            targets.mutate({ slotId: sheet.slot.id, sets, reps })
            setSheet({ kind: 'none' })
          }}
        />
      )}

      {sheet.kind === 'add-pick' && (
        <ExercisePicker
          title={`Add to ${day?.label ?? ''} day`}
          onClose={() => setSheet({ kind: 'none' })}
          onSelect={(e) => setSheet({ kind: 'add-targets', exerciseId: e.id, exerciseName: e.name })}
        />
      )}

      {sheet.kind === 'add-targets' && day && (
        <TargetsSheet
          title={`${sheet.exerciseName} targets`}
          initialSets={3}
          initialReps="8"
          onClose={() => setSheet({ kind: 'none' })}
          onSave={(sets, reps) => {
            const maxOrder = day.slots.reduce((m, s) => Math.max(m, s.slot_order), -1)
            add.mutate({
              dayId: day.id,
              exerciseId: sheet.exerciseId,
              sets,
              reps,
              order: maxOrder + 1,
            })
            setSheet({ kind: 'none' })
          }}
        />
      )}

      <HelpButton title="Editing your program">
        <HelpItem term="tap an exercise">
          replace it permanently — filter by muscle group or search the whole catalog. Old history
          stays on the slot, so progress charts stay continuous.
        </HelpItem>
        <HelpItem term="3×8">tap the targets chip to change sets and reps ('8-12' and 'AMRAP' are fine).</HelpItem>
        <HelpItem term="▲▼">reorder the day.</HelpItem>
        <HelpItem term="✕">
          remove an exercise from the plan. If you've logged sets on it, the history stays and its
          chart remains reachable under Progress.
        </HelpItem>
        <HelpItem term="+ ADD EXERCISE">
          new slot at the end of the day — pick a muscle group, then an exercise, then targets.
        </HelpItem>
        <HelpItem term="vs ⇄">
          this screen changes the plan itself; the ⇄ button during a workout is a one-day
          substitution that leaves the plan alone.
        </HelpItem>
      </HelpButton>
    </main>
  )
}
