import { plateBreakdown, LB_BAR } from '../lib/plates'

/**
 * The app's signature object (CLAUDE.md §7): weight rendered as the
 * actual bar loadout, plates in calibrated colors. Reads as "what do I
 * put on the bar", not decoration.
 */

// lb denominations mapped onto the IPF calibrated palette; size follows weight
const PLATE_STYLE: Record<number, { color: string; h: number; w: number }> = {
  45: { color: 'var(--color-plate-blue)', h: 40, w: 7 },
  35: { color: 'var(--color-plate-yellow)', h: 34, w: 7 },
  25: { color: 'var(--color-plate-green)', h: 28, w: 6 },
  10: { color: 'var(--color-plate-white)', h: 20, w: 5 },
  5: { color: 'var(--color-plate-red)', h: 15, w: 5 },
  2.5: { color: 'var(--color-muted)', h: 11, w: 4 },
}

interface Props {
  weight: number
  barWeight?: number
  className?: string
}

export function PlateStack({ weight, barWeight = LB_BAR, className }: Props) {
  const { perSide, remainder, loadable } = plateBreakdown(weight, barWeight)

  if (!loadable && perSide.length === 0) {
    // below bar weight (dumbbell numbers on a barbell slot, warmups) — show nothing
    return null
  }

  const H = 48
  const mid = H / 2
  const GAP = 2
  const SLEEVE = 16 // bare sleeve beyond the last plate
  const plateSpan = perSide.reduce((s, p) => s + PLATE_STYLE[p]!.w + GAP, 0)
  const halfBar = plateSpan + SLEEVE + 4
  const W = halfBar * 2 + 56 // center collar span

  // plates mirror outward from the collars
  let cursor = 0
  const side = perSide.map((p) => {
    const st = PLATE_STYLE[p]!
    const x = cursor
    cursor += st.w + GAP
    return { st, x }
  })

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        role="img"
        aria-label={`${weight} lb: ${perSide.join(', ') || 'empty bar'} per side`}
      >
        {/* bar */}
        <rect x="0" y={mid - 2} width={W} height="4" rx="1" fill="#3A3733" />
        {/* center numeral */}
        <text
          x={W / 2}
          y={mid - 8}
          textAnchor="middle"
          fill="var(--color-plate-white)"
          fontFamily="IBM Plex Mono"
          fontSize="13"
          fontWeight="500"
        >
          {weight}
        </text>
        {side.map(({ st, x }, i) => (
          // left + right mirror of the same plate
          <g key={i}>
            <rect
              x={W / 2 - 28 - x - st.w}
              y={mid - st.h / 2}
              width={st.w}
              height={st.h}
              rx="1.5"
              fill={st.color}
            />
            <rect
              x={W / 2 + 28 + x}
              y={mid - st.h / 2}
              width={st.w}
              height={st.h}
              rx="1.5"
              fill={st.color}
            />
          </g>
        ))}
      </svg>
      <p className="font-mono text-xs text-muted">
        {perSide.length > 0 ? `${perSide.join(' + ')} / side` : 'empty bar'}
        {remainder > 0 && ` · ${remainder * 2} lb unloadable`}
      </p>
    </div>
  )
}
