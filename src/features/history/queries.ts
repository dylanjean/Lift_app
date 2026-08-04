import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

/**
 * Completed-session rollups from v_session_summary, newest first.
 * Shared by the history screen (full list) and the Today dashboard
 * (recent strip + per-day "last done" hints).
 */
export function useSessionSummaries(limit = 60) {
  return useQuery({
    queryKey: ['sessionSummaries', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_session_summary')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data
    },
  })
}
