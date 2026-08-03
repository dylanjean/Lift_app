import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

/** Days with their slots and planned-exercise names, for the slot picker. */
export function useSlotPicker() {
  return useQuery({
    queryKey: ['slotPicker'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_day')
        .select('id, day_index, label, program_day_exercise(id, slot_order, exercise(name))')
        .order('day_index')
      if (error) throw error
      return data.map((d) => ({
        id: d.id,
        label: d.label,
        slots: d.program_day_exercise
          .sort((a, b) => a.slot_order - b.slot_order)
          .map((s) => ({ id: s.id, name: s.exercise.name })),
      }))
    },
    staleTime: Infinity,
  })
}

/**
 * Chart series from v_slot_progression — aggregation lives in Postgres
 * (CLAUDE.md §4), the client just plots rows.
 */
export function useSlotProgression(slotId: string | null) {
  return useQuery({
    queryKey: ['slotProgression', slotId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_slot_progression')
        .select('*')
        .eq('slot_id', slotId!)
        .order('day')
      if (error) throw error
      return data
    },
    enabled: slotId !== null,
  })
}
