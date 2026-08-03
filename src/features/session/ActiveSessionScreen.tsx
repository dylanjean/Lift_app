import { useNavigate, useParams } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

/**
 * Stub — the real active-session flow (slots, set rows, rest timer, swap)
 * is the next milestone task. This exists so a started session can be
 * finished and the rotation advances.
 */
export function ActiveSessionScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const endSession = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('no session id')
      const { error } = await supabase
        .from('workout_session')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['activeSession'] })
      void qc.invalidateQueries({ queryKey: ['lastCompletedDayIndex'] })
      void navigate('/')
    },
  })

  return (
    <main className="flex min-h-dvh flex-col justify-between px-5 pt-4 pb-8 font-sans">
      <p className="font-mono text-xs text-plate-yellow">SESSION IN PROGRESS</p>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">Exercise logging lands in the next task.</p>
        <button
          type="button"
          onClick={() => endSession.mutate()}
          disabled={endSession.isPending}
          className="h-16 rounded-sm bg-plate-blue font-display text-lg font-bold tracking-wide text-plate-white disabled:opacity-60"
        >
          FINISH WORKOUT
        </button>
      </div>
    </main>
  )
}
