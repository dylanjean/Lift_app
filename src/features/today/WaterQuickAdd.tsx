import { useRef, useState } from 'react'
import { QUICK_ADDS_OZ } from '../../lib/water'
import { useAddWater } from './queries'

const LONG_PRESS_MS = 500

/**
 * Single tap logs the button's amount; holding any button opens the
 * custom-amount sheet (CLAUDE.md §6 — no dialog on the fast path).
 */
export function WaterQuickAdd() {
  const addWater = useAddWater()
  const [customOpen, setCustomOpen] = useState(false)
  const [customOz, setCustomOz] = useState('')
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressed = useRef(false)

  function pressStart() {
    longPressed.current = false
    holdTimer.current = setTimeout(() => {
      longPressed.current = true
      navigator.vibrate?.(50)
      setCustomOpen(true)
    }, LONG_PRESS_MS)
  }

  function pressEnd() {
    if (holdTimer.current) clearTimeout(holdTimer.current)
  }

  function handleClick(oz: number) {
    // the click that follows a long-press must not also log
    if (longPressed.current) return
    addWater.mutate(oz)
  }

  const parsed = Number(customOz)
  const customValid = Number.isFinite(parsed) && parsed > 0

  return (
    <>
      <div className="flex gap-2">
        {QUICK_ADDS_OZ.map((oz) => (
          <button
            key={oz}
            type="button"
            onClick={() => handleClick(oz)}
            onPointerDown={pressStart}
            onPointerUp={pressEnd}
            onPointerLeave={pressEnd}
            onPointerCancel={pressEnd}
            onContextMenu={(e) => e.preventDefault()} // Android long-press menu
            className="h-14 flex-1 rounded-sm border border-raised bg-raised font-mono text-sm text-ink select-none active:border-plate-blue"
          >
            +{oz} oz
          </button>
        ))}
      </div>

      {customOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-label="custom water amount">
          <button type="button" aria-label="close" onClick={() => setCustomOpen(false)} className="flex-1 bg-black/60" />
          <div className="flex gap-2 rounded-t-sm border-t border-raised bg-surface px-4 pt-4 pb-8">
            <input
              type="text"
              inputMode="decimal"
              autoFocus
              placeholder="oz"
              value={customOz}
              onChange={(e) => setCustomOz(e.target.value)}
              className="h-14 w-0 flex-1 rounded-sm border border-raised bg-raised px-3 text-center font-mono text-lg text-ink outline-none focus-visible:border-plate-blue"
            />
            <button
              type="button"
              disabled={!customValid}
              onClick={() => {
                addWater.mutate(parsed)
                setCustomOz('')
                setCustomOpen(false)
              }}
              className="h-14 rounded-sm bg-plate-blue px-6 font-display text-base font-bold text-plate-white disabled:opacity-40"
            >
              ADD
            </button>
          </div>
        </div>
      )}
    </>
  )
}
