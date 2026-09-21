import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export interface CatalogExercise {
  id: string
  name: string
  primary_muscle: string | null
  equipment: string | null
  video_url: string | null
}

/** Whole visible catalog (global seeds + own), one fetch — 53 rows. */
export function useExerciseCatalog() {
  return useQuery({
    queryKey: ['exerciseCatalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise')
        .select('id, name, primary_muscle, equipment, video_url')
        .order('name')
      if (error) throw error
      return data
    },
    staleTime: 5 * 60_000,
  })
}

export interface EditorSlot {
  id: string
  slot_order: number
  target_sets: number
  target_reps: string
  exercise: { id: string; name: string; primary_muscle: string | null }
}

export interface EditorDay {
  id: string
  day_index: number
  label: string
  slots: EditorSlot[]
}

export function useEditorDays() {
  return useQuery({
    queryKey: ['editorDays'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_day')
        .select(
          'id, day_index, label, program_day_exercise(id, slot_order, target_sets, target_reps, exercise(id, name, primary_muscle))',
        )
        // dotted path filters the embedded rows, not the days
        .is('program_day_exercise.archived_at', null)
        .order('day_index')
      if (error) throw error
      return data.map(
        (d): EditorDay => ({
          id: d.id,
          day_index: d.day_index,
          label: d.label,
          slots: d.program_day_exercise
            .map((s) => ({ ...s, exercise: s.exercise }))
            .sort((a, b) => a.slot_order - b.slot_order),
        }),
      )
    },
  })
}

/** Everything the editor touches feeds these screens — refetch them all. */
function invalidateProgramStructure(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ['editorDays'] })
  void qc.invalidateQueries({ queryKey: ['programDays'] })
  void qc.invalidateQueries({ queryKey: ['slotPicker'] })
}

/** Permanently repoint a slot at a different exercise (history stays put). */
export function useReplaceSlotExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ slotId, exerciseId }: { slotId: string; exerciseId: string }) => {
      const { error } = await supabase
        .from('program_day_exercise')
        .update({ exercise_id: exerciseId })
        .eq('id', slotId)
      if (error) throw error
    },
    onSuccess: () => invalidateProgramStructure(qc),
  })
}

export function useUpdateSlotTargets() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ slotId, sets, reps }: { slotId: string; sets: number; reps: string }) => {
      const { error } = await supabase
        .from('program_day_exercise')
        .update({ target_sets: sets, target_reps: reps })
        .eq('id', slotId)
      if (error) throw error
    },
    onSuccess: () => invalidateProgramStructure(qc),
  })
}

/**
 * Swap slot_order with a neighbor. (program_day_id, slot_order) is unique,
 * so this is a three-step dance through a parking value. Not atomic — a
 * mid-flight crash leaves a slot parked at 999, which the next reorder or
 * a manual fix resolves. Acceptable for a solo app; a plpgsql function
 * would make it atomic if it ever bites.
 */
export function useMoveSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ a, b }: { a: EditorSlot; b: EditorSlot }) => {
      const park = 999
      const steps = [
        { id: a.id, slot_order: park },
        { id: b.id, slot_order: a.slot_order },
        { id: a.id, slot_order: b.slot_order },
      ]
      for (const s of steps) {
        const { error } = await supabase
          .from('program_day_exercise')
          .update({ slot_order: s.slot_order })
          .eq('id', s.id)
        if (error) throw error
      }
    },
    onSuccess: () => invalidateProgramStructure(qc),
  })
}

/**
 * Remove a slot from the plan. A slot that was never trained deletes
 * outright; one with logged history hits the intentional FK restrict and
 * falls back to a soft archive, which keeps its sets reachable in charts.
 */
export function useRemoveSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (slotId: string) => {
      const del = await supabase.from('program_day_exercise').delete().eq('id', slotId)
      if (del.error === null) return 'deleted'
      if (del.error.code !== '23503') throw del.error // not the FK restrict — surface it
      const arch = await supabase
        .from('program_day_exercise')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', slotId)
      if (arch.error) throw arch.error
      return 'archived'
    },
    onSuccess: () => invalidateProgramStructure(qc),
  })
}

export function useAddSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      dayId,
      exerciseId,
      sets,
      reps,
      order,
    }: {
      dayId: string
      exerciseId: string
      sets: number
      reps: string
      order: number
    }) => {
      const { error } = await supabase.from('program_day_exercise').insert({
        program_day_id: dayId,
        exercise_id: exerciseId,
        slot_order: order,
        target_sets: sets,
        target_reps: reps,
        rest_seconds: null, // rest comes from the user's device preference
      })
      if (error) throw error
    },
    onSuccess: () => invalidateProgramStructure(qc),
  })
}
