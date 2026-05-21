'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Nav } from '@/components/nav'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Dumbbell, Trash2, Trophy, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Session, SessionSet } from '@/lib/types'

const DAY_MAP: Record<number, string> = {
  1: 'full_body',
  3: 'upper_push',
  5: 'fat_loss',
}

const DAY_LABELS: Record<string, string> = {
  full_body: 'Full Body',
  upper_push: 'Upper Body + Core',
  fat_loss: 'Fat Loss + Strength',
}

export default function Home() {
  const [templates, setTemplates] = useState<any[]>([])
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const dayOfWeek = new Date().getDay()
  const suggestedType = DAY_MAP[dayOfWeek === 0 ? 7 : dayOfWeek]

  const load = useCallback(async () => {
    try {
      const [active, tmpls] = await Promise.all([
        api.getActiveSession(),
        api.getTemplates(),
      ])
      setSession(active)
      setTemplates(tmpls)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const startSession = async (templateId: number) => {
    setStarting(true)
    setError('')
    try {
      const sess = await api.startSession(templateId, today)
      setSession(sess)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setStarting(false)
    }
  }

  const toggleSet = async (set: SessionSet) => {
    const newCompleted = !set.completed
    try {
      await api.completeSet(set.id, {
        completed: newCompleted,
        actual_weight: set.target_weight ?? undefined,
        actual_reps: set.target_reps ?? undefined,
      })
      setSession(prev => {
        if (!prev) return prev
        return {
          ...prev,
          sets: prev.sets.map(s =>
            s.id === set.id ? { ...s, completed: newCompleted ? 1 : 0 } : s
          ),
        }
      })
    } catch (e: any) {
      setError(e.message)
    }
  }

  const completeSession = async () => {
    if (!session) return
    try {
      await api.completeSession(session.id)
      setSession(null)
    } catch (e: any) {
      setError(e.message)
    }
  }

  const abandonSession = async () => {
    if (!session || !confirm('Abandon this workout?')) return
    try {
      await api.deleteSession(session.id)
      setSession(null)
    } catch (e: any) {
      setError(e.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Dumbbell className="animate-pulse text-primary" size={40} />
      </div>
    )
  }

  const completedCount = session?.sets.filter(s => s.completed).length || 0
  const totalCount = session?.sets.length || 0
  const allDone = totalCount > 0 && completedCount === totalCount

  return (
    <main className="pb-20 max-w-lg mx-auto px-4">
      <header className="pt-6 pb-4">
        <h1 className="text-2xl font-bold">
          {session ? (session.template_name || 'Workout') : 'Start a Workout'}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </header>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/20 text-destructive text-sm">{error}</div>
      )}

      {!session ? (
        <WorkoutPicker
          templates={templates}
          suggestedType={suggestedType}
          starting={starting}
          onStart={startSession}
        />
      ) : (
        <ActiveSession
          session={session}
          completedCount={completedCount}
          totalCount={totalCount}
          allDone={allDone}
          onToggleSet={toggleSet}
          onComplete={completeSession}
          onAbandon={abandonSession}
        />
      )}

      <Nav />
    </main>
  )
}

function WorkoutPicker({
  templates,
  suggestedType,
  starting,
  onStart,
}: {
  templates: any[]
  suggestedType?: string
  starting: boolean
  onStart: (id: number) => void
}) {
  return (
    <div className="space-y-3">
      {templates.map(t => {
        const suggested = t.day_type === suggestedType
        return (
          <Card key={t.id} className={cn(suggested && 'border-primary/50')}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t.name}</CardTitle>
                {suggested && (
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    Today
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{t.description}</p>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => onStart(t.id)}
                disabled={starting}
                className="w-full"
                variant={suggested ? 'default' : 'outline'}
                size="lg"
              >
                {starting ? 'Starting...' : 'Start Workout'}
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function ActiveSession({
  session,
  completedCount,
  totalCount,
  allDone,
  onToggleSet,
  onComplete,
  onAbandon,
}: {
  session: Session
  completedCount: number
  totalCount: number
  allDone: boolean
  onToggleSet: (set: SessionSet) => void
  onComplete: () => void
  onAbandon: () => void
}) {
  const exercises = groupByExercise(session.sets)
  const pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{completedCount}/{totalCount} sets</span>
          <span className="text-muted-foreground">{Math.round(pct)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {exercises.map(group => (
        <ExerciseGroup key={group.exerciseId} group={group} onToggleSet={onToggleSet} />
      ))}

      <div className="flex gap-3 pt-4 pb-8">
        <Button variant="outline" onClick={onAbandon} className="flex-shrink-0" size="icon">
          <Trash2 size={18} />
        </Button>
        <Button
          onClick={onComplete}
          disabled={!allDone}
          className="flex-1"
          variant={allDone ? 'success' : 'default'}
          size="lg"
        >
          {allDone ? (
            <>
              <Trophy size={18} className="mr-2" /> Complete Workout
            </>
          ) : (
            'Finish All Sets First'
          )}
        </Button>
      </div>
    </div>
  )
}

interface ExerciseGroupData {
  exerciseId: number
  name: string
  muscle_group: string
  equipment: string | null
  exercise_notes: string | null
  sets: SessionSet[]
}

function groupByExercise(sets: SessionSet[]): ExerciseGroupData[] {
  const map = new Map<number, ExerciseGroupData>()
  for (const s of sets) {
    if (!map.has(s.exercise_id)) {
      map.set(s.exercise_id, {
        exerciseId: s.exercise_id,
        name: s.name,
        muscle_group: s.muscle_group,
        equipment: s.equipment,
        exercise_notes: s.exercise_notes,
        sets: [],
      })
    }
    map.get(s.exercise_id)!.sets.push(s)
  }
  return Array.from(map.values())
}

function ExerciseGroup({
  group,
  onToggleSet,
}: {
  group: ExerciseGroupData
  onToggleSet: (set: SessionSet) => void
}) {
  const allDone = group.sets.every(s => s.completed)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (allDone) {
      const timer = setTimeout(() => setCollapsed(true), 800)
      return () => clearTimeout(timer)
    } else {
      setCollapsed(false)
    }
  }, [allDone])

  return (
    <Card className={cn(allDone && 'border-success/30 opacity-60')}>
      <CardHeader className="pb-2">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setCollapsed(!collapsed)}
        >
          <div className="flex items-center gap-2">
            {allDone && <Check size={16} className="text-success" />}
            <CardTitle className={cn('text-base', allDone && 'line-through text-muted-foreground')}>
              {group.name}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {group.sets.filter(s => s.completed).length}/{group.sets.length}
            </span>
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </div>
        </div>
        {group.exercise_notes && !collapsed && (
          <p className="text-xs text-primary/80 mt-1">{group.exercise_notes}</p>
        )}
      </CardHeader>
      {!collapsed && (
        <CardContent className="space-y-2">
          {group.sets.map(set => (
            <SetRow key={set.id} set={set} onToggle={() => onToggleSet(set)} />
          ))}
        </CardContent>
      )}
    </Card>
  )
}

function SetRow({ set, onToggle }: { set: SessionSet; onToggle: () => void }) {
  const [animating, setAnimating] = useState(false)

  const handleToggle = () => {
    if (!set.completed) setAnimating(true)
    onToggle()
    setTimeout(() => setAnimating(false), 300)
  }

  const label = set.target_duration
    ? `${set.target_duration}s`
    : `${set.target_weight || 'BW'}${set.target_weight ? set.weight_unit : ''} × ${set.target_reps}`

  return (
    <button
      onClick={handleToggle}
      className={cn(
        'w-full flex items-center justify-between p-3 rounded-lg transition-all min-h-[52px]',
        set.completed
          ? 'bg-success/10 border border-success/20'
          : 'bg-muted/50 border border-transparent hover:border-border active:bg-muted',
        animating && 'animate-check'
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all',
            set.completed
              ? 'bg-success border-success'
              : 'border-muted-foreground'
          )}
        >
          {set.completed && <Check size={14} className="text-white" />}
        </div>
        <span className="text-sm font-medium">Set {set.set_number}</span>
      </div>
      <span className={cn('text-sm font-mono', set.completed ? 'text-success' : 'text-foreground')}>
        {label}
      </span>
    </button>
  )
}
