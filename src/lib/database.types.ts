export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      body_metric: {
        Row: {
          id: string
          logged_at: string
          metric_type: string
          user_id: string
          value: number
        }
        Insert: {
          id?: string
          logged_at?: string
          metric_type: string
          user_id?: string
          value: number
        }
        Update: {
          id?: string
          logged_at?: string
          metric_type?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      exercise: {
        Row: {
          cues: string | null
          equipment: string | null
          id: string
          name: string
          primary_muscle: string | null
          user_id: string | null
          video_url: string | null
        }
        Insert: {
          cues?: string | null
          equipment?: string | null
          id?: string
          name: string
          primary_muscle?: string | null
          user_id?: string | null
          video_url?: string | null
        }
        Update: {
          cues?: string | null
          equipment?: string | null
          id?: string
          name?: string
          primary_muscle?: string | null
          user_id?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      exercise_alternate: {
        Row: {
          alternate_id: string
          exercise_id: string
          rank: number
        }
        Insert: {
          alternate_id: string
          exercise_id: string
          rank: number
        }
        Update: {
          alternate_id?: string
          exercise_id?: string
          rank?: number
        }
        Relationships: [
          {
            foreignKeyName: "exercise_alternate_alternate_id_fkey"
            columns: ["alternate_id"]
            isOneToOne: false
            referencedRelation: "exercise"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_alternate_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise"
            referencedColumns: ["id"]
          },
        ]
      }
      fast_session: {
        Row: {
          ended_at: string | null
          id: string
          started_at: string
          target_hours: number
          user_id: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          started_at?: string
          target_hours?: number
          user_id?: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          started_at?: string
          target_hours?: number
          user_id?: string
        }
        Relationships: []
      }
      program: {
        Row: {
          id: string
          name: string
          source_url: string | null
          user_id: string
          weeks: number | null
        }
        Insert: {
          id?: string
          name: string
          source_url?: string | null
          user_id?: string
          weeks?: number | null
        }
        Update: {
          id?: string
          name?: string
          source_url?: string | null
          user_id?: string
          weeks?: number | null
        }
        Relationships: []
      }
      program_day: {
        Row: {
          day_index: number
          id: string
          label: string
          program_id: string
        }
        Insert: {
          day_index: number
          id?: string
          label: string
          program_id: string
        }
        Update: {
          day_index?: number
          id?: string
          label?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_day_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "program"
            referencedColumns: ["id"]
          },
        ]
      }
      program_day_exercise: {
        Row: {
          exercise_id: string
          id: string
          program_day_id: string
          rest_seconds: number | null
          slot_order: number
          target_reps: string
          target_sets: number
        }
        Insert: {
          exercise_id: string
          id?: string
          program_day_id: string
          rest_seconds?: number | null
          slot_order: number
          target_reps: string
          target_sets: number
        }
        Update: {
          exercise_id?: string
          id?: string
          program_day_id?: string
          rest_seconds?: number | null
          slot_order?: number
          target_reps?: string
          target_sets?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_day_exercise_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_day_exercise_program_day_id_fkey"
            columns: ["program_day_id"]
            isOneToOne: false
            referencedRelation: "program_day"
            referencedColumns: ["id"]
          },
        ]
      }
      set_log: {
        Row: {
          exercise_id: string
          id: string
          logged_at: string
          program_day_exercise_id: string
          reps: number
          rpe: number | null
          session_id: string
          set_index: number
          substituted_for_id: string | null
          user_id: string
          weight: number
        }
        Insert: {
          exercise_id: string
          id?: string
          logged_at?: string
          program_day_exercise_id: string
          reps: number
          rpe?: number | null
          session_id: string
          set_index: number
          substituted_for_id?: string | null
          user_id?: string
          weight: number
        }
        Update: {
          exercise_id?: string
          id?: string
          logged_at?: string
          program_day_exercise_id?: string
          reps?: number
          rpe?: number | null
          session_id?: string
          set_index?: number
          substituted_for_id?: string | null
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "set_log_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_log_program_day_exercise_id_fkey"
            columns: ["program_day_exercise_id"]
            isOneToOne: false
            referencedRelation: "program_day_exercise"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_log_program_day_exercise_id_fkey"
            columns: ["program_day_exercise_id"]
            isOneToOne: false
            referencedRelation: "v_slot_progression"
            referencedColumns: ["slot_id"]
          },
          {
            foreignKeyName: "set_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_session_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "set_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_session"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_log_substituted_for_id_fkey"
            columns: ["substituted_for_id"]
            isOneToOne: false
            referencedRelation: "exercise"
            referencedColumns: ["id"]
          },
        ]
      }
      water_log: {
        Row: {
          amount_ml: number
          id: string
          logged_at: string
          user_id: string
        }
        Insert: {
          amount_ml: number
          id?: string
          logged_at?: string
          user_id?: string
        }
        Update: {
          amount_ml?: number
          id?: string
          logged_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_session: {
        Row: {
          active_seconds: number | null
          ended_at: string | null
          id: string
          notes: string | null
          program_day_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          active_seconds?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          program_day_id: string
          started_at?: string
          user_id?: string
        }
        Update: {
          active_seconds?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          program_day_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_session_program_day_id_fkey"
            columns: ["program_day_id"]
            isOneToOne: false
            referencedRelation: "program_day"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_session_summary: {
        Row: {
          active_seconds: number | null
          ended_at: string | null
          label: string | null
          session_id: string | null
          sets: number | null
          started_at: string | null
          swaps: number | null
          volume: number | null
        }
        Relationships: []
      }
      v_slot_progression: {
        Row: {
          day: string | null
          est_1rm: number | null
          performed: string | null
          slot_id: string | null
          top_weight: number | null
          volume: number | null
          was_swapped: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
