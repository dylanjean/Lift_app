/**
 * Water is stored as ml (integer, schema) and displayed as fl oz
 * (owner preference). Conversions round to whole units for display.
 */
export const DAILY_GOAL_OZ = 85
/** Owner's quick-adds; 35 oz is his bottle. */
export const QUICK_ADDS_OZ = [8, 16, 35] as const

const ML_PER_OZ = 29.5735

export function ozToMl(oz: number): number {
  return Math.round(oz * ML_PER_OZ)
}

export function mlToOz(ml: number): number {
  return Math.round(ml / ML_PER_OZ)
}

/** ISO timestamp of local midnight — "today" for a human, sent to a timestamptz filter. */
export function startOfLocalDayISO(now: Date = new Date()): string {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
