/**
 * User's rest-between-sets preference. The program's rest_seconds stays in
 * the DB as the source plan; this is the owner's own pace (he found 2:00
 * long — default 45s). Stored per device in localStorage.
 */
export const REST_PRESETS = [30, 45, 60, 90, 120] as const
export const DEFAULT_REST_SECONDS = 45

const KEY = 'ppl.restSeconds'

export function getRestPref(): number {
  const raw = localStorage.getItem(KEY)
  const n = raw === null ? NaN : Number(raw)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_REST_SECONDS
}

export function setRestPref(seconds: number): void {
  localStorage.setItem(KEY, String(seconds))
}

export function nextRestPreset(current: number): number {
  const idx = REST_PRESETS.findIndex((p) => p === current)
  // unknown current value folds back to the first preset
  return REST_PRESETS[(idx + 1) % REST_PRESETS.length]!
}
