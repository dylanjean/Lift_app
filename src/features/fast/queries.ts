import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

/** The running fast if any (partial unique index guarantees at most one). */
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

export function useStartFast() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      // started_at + target_hours (16, per owner's 16:8) default in the DB
      const { error } = await supabase.from('fast_session').insert({})
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['activeFast'] }),
  })
}

export function useEndFast() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (fastId: string) => {
      const { error } = await supabase
        .from('fast_session')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', fastId)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['activeFast'] }),
  })
}
