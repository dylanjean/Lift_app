import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { ozToMl, startOfLocalDayISO } from '../../lib/water'

/** The sole program's days, ordered. RLS scopes everything to the user. */
export function useProgramDays() {
  return useQuery({
    queryKey: ['programDays'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_day')
        .select('id, day_index, label, program_day_exercise(id)')
        .order('day_index')
      if (error) throw error
      return data.map((d) => ({
        id: d.id,
        day_index: d.day_index,
        label: d.label,
        slotCount: d.program_day_exercise.length,
      }))
    },
    staleTime: Infinity, // program structure changes ~never mid-session
  })
}

/** day_index of the last completed session, null if none yet. */
export function useLastCompletedDayIndex() {
  return useQuery({
    queryKey: ['lastCompletedDayIndex'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_session')
        .select('program_day(day_index)')
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data?.program_day.day_index ?? null
    },
  })
}

/** The in-flight session if one exists (schema guarantees at most one). */
export function useActiveSession() {
  return useQuery({
    queryKey: ['activeSession'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_session')
        .select('id, program_day_id, started_at, program_day(label)')
        .is('ended_at', null)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useStartSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (programDayId: string) => {
      const { data, error } = await supabase
        .from('workout_session')
        .insert({ program_day_id: programDayId })
        .select('id')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['activeSession'] }),
  })
}

/** Today's water total in ml. */
export function useTodayWaterMl() {
  return useQuery({
    queryKey: ['todayWater'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('water_log')
        .select('amount_ml')
        .gte('logged_at', startOfLocalDayISO())
      if (error) throw error
      return data.reduce((sum, r) => sum + r.amount_ml, 0)
    },
  })
}

/**
 * Optimistic add — the gym has spotty signal and a water tap must never
 * feel blocked on the network (CLAUDE.md §6).
 */
export function useAddWater() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (oz: number) => {
      const { error } = await supabase.from('water_log').insert({ amount_ml: ozToMl(oz) })
      if (error) throw error
    },
    onMutate: async (oz) => {
      await qc.cancelQueries({ queryKey: ['todayWater'] })
      const prev = qc.getQueryData<number>(['todayWater'])
      qc.setQueryData<number>(['todayWater'], (old) => (old ?? 0) + ozToMl(oz))
      return { prev }
    },
    onError: (_err, _oz, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(['todayWater'], ctx.prev)
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ['todayWater'] }),
  })
}

/** The running fast if any (schema guarantees at most one). */
export function useActiveFast() {
  return useQuery({
    queryKey: ['activeFast'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fast_session')
        .select('id, started_at, target_hours')
        .is('ended_at', null)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}
