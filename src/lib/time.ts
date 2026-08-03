/**
 * Elapsed time is always *computed from timestamps on render*, never
 * accumulated by an interval — intervals die when Android backgrounds
 * the PWA, timestamps don't (CLAUDE.md §6, fast timer acceptance test).
 */
export function elapsedSeconds(startedAtISO: string, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(startedAtISO).getTime()) / 1000))
}

/** 51305 → "14:15:05" */
export function formatHMS(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

/** 95 → "1:35" for compact rest-timer display */
export function formatMS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
