import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export interface SlotExercise {
  id: string
  name: string
  equipment: string | null
  cues: string | null
  video_url: string | null
}

export interface Slot {
  id: string
  slot_order: number
  target_sets: number
  target_reps: string
  rest_seconds: number | null
  exercise: SlotExercise // the planned exercise
}

export interface LoggedSet {
  id: string
  program_day_exercise_id: string
  exercise_id: string
  substituted_for_id: string | null
  set_index: number
  weight: number
  reps: number
  rpe: number | null
}

/** Session header + the day's slots, ordered. Static during a workout. */
export function useSessionDetail(sessionId: string) {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_session')
        .select(
          `id, started_at, ended_at,
           program_day(
             id, label,
             program_day_exercise(
               id, slot_order, target_sets, target_reps, rest_seconds,
               exercise(id, name, equipment, cues, video_url)
             )
           )`,
        )
        .eq('id', sessionId)
        .single()
      if (error) throw error
      const slots: Slot[] = data.program_day.program_day_exercise
        .map((s) => ({ ...s, exercise: s.exercise }))
        .sort((a, b) => a.slot_order - b.slot_order)
      return { id: data.id, started_at: data.started_at, ended_at: data.ended_at, label: data.program_day.label, slots }
    },
    staleTime: Infinity,
  })
}

/** All sets logged in this session — drives per-slot progress and prefill. */
export function useSessionSets(sessionId: string) {
  return useQuery({
    queryKey: ['sessionSets', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('set_log')
        .select('id, program_day_exercise_id, exercise_id, substituted_for_id, set_index, weight, reps, rpe')
        .eq('session_id', sessionId)
        .order('set_index')
      if (error) throw error
      return data as LoggedSet[]
    },
  })
}

/**
 * The most recent prior session's sets for an exercise — "what did I do
 * last time". Keyed by exercise so a swap immediately shows the numbers
 * for the alternate, not the planned lift (CLAUDE.md §6 swap flow).
 */
export function usePrevSets(exerciseId: string, currentSessionId: string) {
  return useQuery({
    queryKey: ['prevSets', exerciseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('set_log')
        .select('session_id, set_index, weight, reps, rpe, logged_at')
        .eq('exercise_id', exerciseId)
        .neq('session_id', currentSessionId)
        .order('logged_at', { ascending: false })
        .limit(15)
      if (error) throw error
      const lastSession = data[0]?.session_id
      if (!lastSession) return []
      return data
        .filter((r) => r.session_id === lastSession)
        .sort((a, b) => a.set_index - b.set_index)
    },
  })
}

/** Ranked alternates for a planned exercise, for the swap sheet. */
export function useAlternates(plannedExerciseId: string) {
  return useQuery({
    queryKey: ['alternates', plannedExerciseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_alternate')
        .select('rank, alternate:exercise!exercise_alternate_alternate_id_fkey(id, name, equipment, cues, video_url)')
        .eq('exercise_id', plannedExerciseId)
        .order('rank')
      if (error) throw error
      return data.map((r) => r.alternate)
    },
    staleTime: Infinity,
  })
}

/** Name search across all visible exercises (seed + own), for the swap sheet. */
export function useExerciseSearch(term: string) {
  const q = term.trim()
  return useQuery({
    queryKey: ['exerciseSearch', q],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise')
        .select('id, name, equipment, cues, video_url')
        .ilike('name', `%${q}%`)
        .order('name')
        .limit(12)
      if (error) throw error
      return data
    },
    enabled: q.length >= 2,
  })
}

export interface LogSetInput {
  sessionId: string
  slotId: string
  exerciseId: string
  substitutedForId: string | null
  setIndex: number
  weight: number
  reps: number
  rpe: number | null
}

/**
 * Optimistic: the set appears in the list instantly and the rest timer
 * starts from the tap, not from the server ack (CLAUDE.md §6 — never
 * block on the network mid-set).
 */
export function useLogSet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: LogSetInput) => {
      const { data, error } = await supabase
        .from('set_log')
        .insert({
          session_id: input.sessionId,
          program_day_exercise_id: input.slotId,
          exercise_id: input.exerciseId,
          substituted_for_id: input.substitutedForId,
          set_index: input.setIndex,
          weight: input.weight,
          reps: input.reps,
          rpe: input.rpe,
        })
        .select('id')
        .single()
      if (error) throw error
      return data
    },
    onMutate: async (input) => {
      const key = ['sessionSets', input.sessionId]
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<LoggedSet[]>(key)
      const optimistic: LoggedSet = {
        id: `optimistic-${input.slotId}-${input.setIndex}`,
        program_day_exercise_id: input.slotId,
        exercise_id: input.exerciseId,
        substituted_for_id: input.substitutedForId,
        set_index: input.setIndex,
        weight: input.weight,
        reps: input.reps,
        rpe: input.rpe,
      }
      qc.setQueryData<LoggedSet[]>(key, (old) => [...(old ?? []), optimistic])
      return { prev, key }
    },
    onError: (_e, _input, ctx) => {
      if (ctx) qc.setQueryData(ctx.key, ctx.prev)
    },
    onSettled: (_d, _e, input) => {
      void qc.invalidateQueries({ queryKey: ['sessionSets', input.sessionId] })
    },
  })
}

export function useFinishSession(sessionId: string, startedAt: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const active_seconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
      const { error } = await supabase
        .from('workout_session')
        .update({ ended_at: new Date().toISOString(), active_seconds })
        .eq('id', sessionId)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['activeSession'] })
      void qc.invalidateQueries({ queryKey: ['lastCompletedDayIndex'] })
    },
  })
}

/** Delete the session outright (accidental start, or a bailed workout). Sets cascade. */
export function useDiscardSession(sessionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('workout_session').delete().eq('id', sessionId)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['activeSession'] })
    },
  })
}
