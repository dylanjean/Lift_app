import { useEffect } from 'react'

/**
 * Keeps the screen on during a workout (CLAUDE.md §6). The OS silently
 * releases wake locks when the app is backgrounded, so we re-request on
 * visibilitychange. Failure is non-fatal — some browsers deny on low
 * battery — the app must keep working, just without the lock.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return

    let sentinel: WakeLockSentinel | null = null
    let disposed = false

    const request = async () => {
      try {
        const s = await navigator.wakeLock.request('screen')
        if (disposed) void s.release()
        else sentinel = s
      } catch {
        /* denied (battery saver etc.) — nothing to do */
      }
    }

    void request()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void request()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVisibility)
      void sentinel?.release()
    }
  }, [active])
}
