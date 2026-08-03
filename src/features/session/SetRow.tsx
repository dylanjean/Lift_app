import { useState } from 'react'
import type { LoggedSet } from './queries'

interface Suggestion {
  weight: number | null
  reps: number | null
  rpe: number | null
}

interface Props {
  setIndex: number
  targetReps: string
  logged: LoggedSet | undefined
  /** Ghost values shown as placeholders; logging with a field left blank uses them. */
  suggestion: Suggestion
  onLog: (weight: number, reps: number, rpe: number | null) => void
}

/*
 * Plain controlled inputs rather than react-hook-form: three numeric
 * fields with placeholder-as-default semantics ("tap LOG to repeat last
 * time's numbers") — RHF's registration/validation model fights that.
 * RHF stays the tool for real forms (program editor later).
 */
export function SetRow({ setIndex, targetReps, logged, suggestion, onLog }: Props) {
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [rpe, setRpe] = useState('')

  if (logged) {
    return (
      <div className="flex h-14 items-center gap-3 rounded-sm border border-raised bg-raised/50 px-3">
        <span className="w-6 font-mono text-xs text-muted">{logged.set_index}</span>
        <span className="flex-1 font-mono text-base text-ink">
          {logged.weight} lb × {logged.reps}
          {logged.rpe !== null && <span className="text-muted"> @ {logged.rpe}</span>}
        </span>
        <span aria-hidden className="text-plate-green">✓</span>
      </div>
    )
  }

  const effWeight = weight !== '' ? Number(weight) : suggestion.weight
  const effReps = reps !== '' ? Number(reps) : suggestion.reps
  const effRpe = rpe !== '' ? Number(rpe) : null
  const valid =
    effWeight !== null && effReps !== null && Number.isFinite(effWeight) && Number.isFinite(effReps) && effReps > 0

  return (
    <div className="flex h-14 items-center gap-2 rounded-sm border border-raised px-3">
      <span className="w-6 font-mono text-xs text-muted">{setIndex}</span>
      <input
        type="text"
        inputMode="decimal"
        placeholder={suggestion.weight !== null ? String(suggestion.weight) : 'lb'}
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        aria-label={`set ${setIndex} weight`}
        className="h-11 w-0 flex-[2] rounded-sm bg-raised px-2 text-center font-mono text-base text-ink placeholder:text-muted/60 outline-none focus-visible:ring-1 focus-visible:ring-plate-blue"
      />
      <input
        type="text"
        inputMode="numeric"
        placeholder={suggestion.reps !== null ? String(suggestion.reps) : targetReps}
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        aria-label={`set ${setIndex} reps`}
        className="h-11 w-0 flex-[1.4] rounded-sm bg-raised px-2 text-center font-mono text-base text-ink placeholder:text-muted/60 outline-none focus-visible:ring-1 focus-visible:ring-plate-blue"
      />
      <input
        type="text"
        inputMode="decimal"
        placeholder="rpe"
        value={rpe}
        onChange={(e) => setRpe(e.target.value)}
        aria-label={`set ${setIndex} rpe`}
        className="h-11 w-0 flex-1 rounded-sm bg-raised px-2 text-center font-mono text-sm text-ink placeholder:text-muted/60 outline-none focus-visible:ring-1 focus-visible:ring-plate-blue"
      />
      <button
        type="button"
        disabled={!valid}
        onClick={() => valid && onLog(effWeight, effReps, effRpe)}
        className="h-11 rounded-sm bg-plate-blue px-3 font-display text-sm font-bold text-plate-white disabled:opacity-40"
      >
        LOG
      </button>
    </div>
  )
}
