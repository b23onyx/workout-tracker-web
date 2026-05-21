export interface WarmupCardio {
  name: string
  duration_minutes: number
  notes: string | null
}

export interface Template {
  id: number
  name: string
  day_type: string
  description: string
  day_of_week: number
  warmup_cardio?: WarmupCardio
  exercises: TemplateExercise[]
}

export interface TemplateExercise {
  id: number
  template_id: number
  exercise_id: number
  sets: number
  reps: number | null
  weight: number | null
  weight_unit: string
  duration_seconds: number | null
  sort_order: number
  notes: string | null
  name: string
  muscle_group: string
  equipment: string | null
  exercise_notes: string | null
  prog_weight: number | null
  prog_unit: string | null
  next_target: number | null
  prog_notes: string | null
  phase: string
}

export interface Session {
  id: number
  template_id: number
  date: string
  started_at: string
  completed_at: string | null
  notes: string | null
  template_name?: string
  day_type?: string
  warmup_cardio?: WarmupCardio
  sets: SessionSet[]
  completed_sets?: number
  total_sets?: number
}

export interface SessionSet {
  id: number
  session_id: number
  exercise_id: number
  set_number: number
  target_weight: number | null
  target_reps: number | null
  target_duration: number | null
  actual_weight: number | null
  actual_reps: number | null
  completed: number
  completed_at: string | null
  weight_unit: string | null
  name: string
  muscle_group: string
  equipment: string | null
  exercise_notes: string | null
  phase: string
}

export interface Stats {
  total_sessions: number
  sessions_this_week: number
  last_session: string | null
  current_streak: number
}
