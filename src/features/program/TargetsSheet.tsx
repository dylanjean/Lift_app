import { useState } from 'react'

/** Small sheet for a slot's sets × reps. reps stays text — '8-12', 'AMRAP' etc. */
export function TargetsSheet({
  title,
  initialSets,
  initialReps,
  onSave,
  onClose,
}: {
  title: string
  initialSets: number
  initialReps: string
  onSave: (sets: number, reps: string) => void
  onClose: () => void
}) {
  const [sets, setSets] = useState(String(initialSets))
  const [reps, setReps] = useState(initialReps)

  const setsN = Number(sets)
  const valid = Number.isInteger(setsN) && setsN > 0 && reps.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-label={title}>
      <button type="button" aria-label="close" onClick={onClose} className="flex-1 bg-black/60" />
      <div className="rounded-t-sm border-t border-raised bg-surface px-4 pt-4 pb-8">
        <p className="mb-3 font-display text-sm font-bold tracking-wide uppercase">{title}</p>
        <div className="flex items-center gap-3">
          <label className="flex flex-1 flex-col gap-1">
            <span className="font-mono text-xs text-muted">SETS</span>
            <input
              type="text"
              inputMode="numeric"
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              className="h-14 rounded-sm border border-raised bg-raised px-3 text-center font-mono text-lg text-ink outline-none focus-visible:border-plate-blue"
            />
          </label>
          <span className="mt-5 font-mono text-muted">×</span>
          <label className="flex flex-1 flex-col gap-1">
            <span className="font-mono text-xs text-muted">REPS</span>
            <input
              type="text"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder="8-12"
              className="h-14 rounded-sm border border-raised bg-raised px-3 text-center font-mono text-lg text-ink outline-none focus-visible:border-plate-blue"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={!valid}
          onClick={() => valid && onSave(setsN, reps.trim())}
          className="mt-4 h-14 w-full rounded-sm bg-plate-blue font-display text-sm font-bold tracking-wide text-plate-white disabled:opacity-40"
        >
          SAVE
        </button>
      </div>
    </div>
  )
}
