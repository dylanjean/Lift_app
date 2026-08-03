import { useEffect, useState } from 'react'

/**
 * Re-render on an interval — for clock displays only. All elapsed values
 * are computed from timestamps at render time (src/lib/time.ts), so a
 * missed tick while backgrounded never skews anything: the next render
 * shows the correct value.
 */
export function useTick(ms: number, enabled = true): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => setTick((t) => t + 1), ms)
    return () => clearInterval(id)
  }, [ms, enabled])
  return tick
}
