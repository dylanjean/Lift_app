import { useState } from 'react'
import type { SlotExercise } from './queries'
import { useAlternates, useExerciseSearch } from './queries'

interface Props {
  planned: SlotExercise
  current: SlotExercise
  onSelect: (exercise: SlotExercise) => void
  onClose: () => void
}

/**
 * Bottom sheet: ranked alternates first (one tap to swap — two taps total
 * counting the swap icon), search for anything else. Selecting the planned
 * exercise reverts the slot.
 */
export function SwapSheet({ planned, current, onSelect, onClose }: Props) {
  const [term, setTerm] = useState('')
  const alternates = useAlternates(planned.id)
  const search = useExerciseSearch(term)

  const searching = term.trim().length >= 2
  const list: SlotExercise[] = searching ? (search.data ?? []) : (alternates.data ?? [])
  const rows = list.filter((e) => e.id !== current.id)
  const swapped = current.id !== planned.id

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-label="swap exercise">
      <button type="button" aria-label="close" onClick={onClose} className="flex-1 bg-black/60" />
      <div className="max-h-[75dvh] overflow-y-auto rounded-t-sm border-t border-raised bg-surface px-4 pt-4 pb-8">
        <p className="mb-1 text-xs text-muted">
          {planned.name} is planned — equipment taken?
        </p>
        <input
          type="search"
          placeholder="Search any exercise…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="mb-3 h-12 w-full rounded-sm border border-raised bg-raised px-3 text-base text-ink outline-none focus-visible:border-plate-blue"
        />

        {swapped && !searching && (
          <SheetRow
            label={planned.name}
            sub="revert to planned"
            accent
            onClick={() => onSelect(planned)}
          />
        )}

        {rows.map((e, i) => (
          <SheetRow
            key={e.id}
            label={e.name}
            sub={[!searching ? `#${i + 1}` : null, e.equipment].filter(Boolean).join(' · ')}
            onClick={() => onSelect(e)}
          />
        ))}

        {rows.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">
            {searching ? 'No matches' : 'No ranked alternates for this exercise'}
          </p>
        )}
      </div>
    </div>
  )
}

function SheetRow({
  label,
  sub,
  accent = false,
  onClick,
}: {
  label: string
  sub: string
  accent?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 w-full items-center justify-between rounded-sm px-2 text-left active:bg-raised"
    >
      <span className={`text-base ${accent ? 'text-plate-blue' : 'text-ink'}`}>{label}</span>
      <span className="font-mono text-xs text-muted">{sub}</span>
    </button>
  )
}
