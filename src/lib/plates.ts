/**
 * Greedy plate breakdown for one side of a bar (CLAUDE.md §7).
 * Owner's rack: 45 lb bar; 45/35/25/10/5/2.5 plates per side.
 */
export const LB_BAR = 45
export const LB_PLATES = [45, 35, 25, 10, 5, 2.5] as const

export interface PlateBreakdown {
  /** plates for ONE side, heaviest first, e.g. 185 → [45, 25] */
  perSide: number[]
  /** weight that couldn't be represented (per side), 0 when exact */
  remainder: number
  /** total below bar weight, or an unloadable fraction */
  loadable: boolean
}

export function plateBreakdown(
  weight: number,
  barWeight: number = LB_BAR,
  plates: readonly number[] = LB_PLATES,
): PlateBreakdown {
  if (!Number.isFinite(weight) || weight < barWeight) {
    return { perSide: [], remainder: 0, loadable: false }
  }
  let side = (weight - barWeight) / 2
  const perSide: number[] = []
  for (const p of plates) {
    while (side >= p - 1e-9) {
      perSide.push(p)
      side -= p
    }
  }
  const remainder = Math.round(side * 100) / 100
  return { perSide, remainder, loadable: remainder === 0 }
}
