import { useMemo, useState } from 'react'
import type { CatalogExercise } from './queries'
import { useExerciseCatalog } from './queries'

/**
 * Catalog browser for the program editor: muscle-group chips + search over
 * every exercise. This is the "pick by target muscle" surface — the
 * catalog is already tagged with primary_muscle, so filtering is free.
 */
export function ExercisePicker({
  title,
  excludeId,
  onSelect,
  onClose,
}: {
  title: string
  /** current exercise of the slot being edited, hidden from the list */
  excludeId?: string
  onSelect: (exercise: CatalogExercise) => void
  onClose: () => void
}) {
  const catalog = useExerciseCatalog()
  const [muscle, setMuscle] = useState<string | null>(null)
  const [term, setTerm] = useState('')

  const muscles = useMemo(() => {
    const set = new Set<string>()
    for (const e of catalog.data ?? []) if (e.primary_muscle) set.add(e.primary_muscle)
    return [...set].sort()
  }, [catalog.data])

  const q = term.trim().toLowerCase()
  const rows = (catalog.data ?? []).filter(
    (e) =>
      e.id !== excludeId &&
      (muscle === null || e.primary_muscle === muscle) &&
      (q === '' || e.name.toLowerCase().includes(q)),
  )

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-label={title}>
      <button type="button" aria-label="close" onClick={onClose} className="flex-1 bg-black/60" />
      <div className="flex max-h-[80dvh] flex-col rounded-t-sm border-t border-raised bg-surface pt-4 pb-8">
        <p className="mb-3 px-4 font-display text-sm font-bold tracking-wide uppercase">{title}</p>

        {/* muscle chips — horizontal scroll, one tap to filter */}
        <div className="mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
          <Chip label="all" active={muscle === null} onClick={() => setMuscle(null)} />
          {muscles.map((m) => (
            <Chip key={m} label={m} active={muscle === m} onClick={() => setMuscle(m)} />
          ))}
        </div>

        <div className="px-4">
          <input
            type="search"
            placeholder="Search…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="mb-2 h-12 w-full rounded-sm border border-raised bg-raised px-3 text-base text-ink outline-none focus-visible:border-plate-blue"
          />
        </div>

        <div className="overflow-y-auto px-4">
          {rows.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => onSelect(e)}
              className="flex h-14 w-full items-center justify-between rounded-sm px-2 text-left active:bg-raised"
            >
              <span className="text-base text-ink">{e.name}</span>
              <span className="font-mono text-xs text-muted">
                {[e.primary_muscle, e.equipment].filter(Boolean).join(' · ')}
              </span>
            </button>
          ))}
          {rows.length === 0 && <p className="py-6 text-center text-sm text-muted">No matches</p>}
        </div>
      </div>
    </div>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 shrink-0 rounded-sm border px-3 font-mono text-xs uppercase ${
        active ? 'border-plate-blue text-ink' : 'border-raised text-muted'
      }`}
    >
      {label}
    </button>
  )
}
