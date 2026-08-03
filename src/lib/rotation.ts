/**
 * PPL rotation: the next day is whatever follows the last *completed*
 * session's day, wrapping around. No history → start at the first day.
 * Pure so it can grow a test suite later (CLAUDE.md §8).
 */
export function nextDayIndex(lastCompletedDayIndex: number | null, dayCount: number): number {
  if (dayCount <= 0) throw new Error('program has no days')
  if (lastCompletedDayIndex === null) return 0
  return (lastCompletedDayIndex + 1) % dayCount
}
