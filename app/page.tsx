'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import { Nav } from '@/components/nav'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Dumbbell, Trash2, Trophy, ChevronDown, ChevronUp, Play, Pause, RotateCcw, Footprints, SkipForward, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Session, SessionSet, WarmupCardio } from '@/lib/types'

const DAY_MAP: Record<number, string> = {
  1: 'full_body',
  3: 'upper_push',
  5: 'fat_loss',
}

export default function Home() {
  const [templates, setTemplates] = useState<any[]>([])
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [showComplete, setShowComplete] = useState(false)
  const [showStretching, setShowStretching] = useState(false)

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

  const updateSet = async (set: SessionSet, data: { completed?: boolean; actual_weight?: number; actual_reps?: number }) => {
    try {
      await api.completeSet(set.id, data)
      setSession(prev => {
        if (!prev) return prev
        return {
          ...prev,
          sets: prev.sets.map(s =>
            s.id === set.id ? {
              ...s,
              completed: data.completed !== undefined ? (data.completed ? 1 : 0) : s.completed,
              actual_weight: data.actual_weight !== undefined ? data.actual_weight : s.actual_weight,
              actual_reps: data.actual_reps !== undefined ? data.actual_reps : s.actual_reps,
            } : s
          ),
        }
      })
    } catch (e: any) {
      setError(e.message)
    }
  }

  const completeSession = async (notes?: string) => {
    if (!session) return
    try {
      await api.completeSession(session.id, notes)
      setSession(null)
      setShowComplete(false)
      setShowStretching(false)
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

  const workingSets = session?.sets.filter(s => s.phase !== 'stretch') || []
  const completedCount = workingSets.filter(s => s.completed).length
  const totalCount = workingSets.length
  const allWorkingDone = totalCount > 0 && completedCount === totalCount
  const stretchSets = session?.sets.filter(s => s.phase === 'stretch') || []

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
      ) : showStretching ? (
        <GuidedStretching
          stretches={stretchSets}
          onUpdateSet={updateSet}
          onFinish={() => { setShowStretching(false); setShowComplete(true) }}
          onSkipAll={() => { setShowStretching(false); setShowComplete(true) }}
        />
      ) : showComplete ? (
        <CompleteModal
          onComplete={completeSession}
          onBack={() => setShowComplete(false)}
        />
      ) : (
        <ActiveSession
          session={session}
          completedCount={completedCount}
          totalCount={totalCount}
          allWorkingDone={allWorkingDone}
          onUpdateSet={updateSet}
          onStartStretching={() => setShowStretching(true)}
          onSkipToComplete={() => setShowComplete(true)}
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
              {t.warmup_cardio && (
                <p className="text-xs text-primary/70 mt-1">
                  <Footprints size={12} className="inline mr-1" />
                  Starts with {t.warmup_cardio.duration_minutes}min {t.warmup_cardio.name.toLowerCase()}
                </p>
              )}
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
  allWorkingDone,
  onUpdateSet,
  onStartStretching,
  onSkipToComplete,
  onAbandon,
}: {
  session: Session
  completedCount: number
  totalCount: number
  allWorkingDone: boolean
  onUpdateSet: (set: SessionSet, data: { completed?: boolean; actual_weight?: number; actual_reps?: number }) => void
  onStartStretching: () => void
  onSkipToComplete: () => void
  onAbandon: () => void
}) {
  const warmupSets = session.sets.filter(s => s.phase === 'warmup')
  const workingSets = session.sets.filter(s => s.phase === 'working')
  const finisherSets = session.sets.filter(s => s.phase === 'finisher')
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

      {session.warmup_cardio && (
        <WarmupCardioCard cardio={session.warmup_cardio} />
      )}

      {warmupSets.length > 0 && (
        <PhaseSection
          title="Warm-up Sets"
          subtitle="Light weight — don't count for progression"
          sets={warmupSets}
          onUpdateSet={onUpdateSet}
          badgeColor="text-yellow-500"
        />
      )}

      {workingSets.length > 0 && (
        <PhaseSection
          title="Working Sets"
          sets={workingSets}
          onUpdateSet={onUpdateSet}
        />
      )}

      {finisherSets.length > 0 && (
        <PhaseSection
          title="Finisher"
          subtitle="Push through — short rest between rounds"
          sets={finisherSets}
          onUpdateSet={onUpdateSet}
          badgeColor="text-orange-500"
        />
      )}

      <div className="flex gap-3 pt-4 pb-8">
        <Button variant="outline" onClick={onAbandon} className="flex-shrink-0" size="icon">
          <Trash2 size={18} />
        </Button>
        {allWorkingDone ? (
          <div className="flex-1 flex gap-2">
            <Button
              onClick={onStartStretching}
              className="flex-1"
              variant="default"
              size="lg"
            >
              Start Stretching
            </Button>
            <Button
              onClick={onSkipToComplete}
              variant="outline"
              size="lg"
            >
              Skip
            </Button>
          </div>
        ) : (
          <Button
            disabled
            className="flex-1"
            size="lg"
          >
            Finish All Sets First
          </Button>
        )}
      </div>
    </div>
  )
}

function WarmupCardioCard({ cardio }: { cardio: WarmupCardio }) {
  const [done, setDone] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const targetSeconds = cardio.duration_minutes * 60

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => s + 1)
      }, 1000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <Card className={cn(done && 'border-success/30 opacity-60')}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Footprints size={16} className="text-yellow-500" />
            <CardTitle className="text-base">Cardio Warm-up</CardTitle>
          </div>
          {done && <Check size={16} className="text-success" />}
        </div>
        <p className="text-sm text-muted-foreground">
          {cardio.duration_minutes}min {cardio.name}
        </p>
        {cardio.notes && <p className="text-xs text-primary/80 mt-1">{cardio.notes}</p>}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn('text-2xl font-mono tabular-nums', seconds >= targetSeconds && 'text-success')}>
              {formatTime(seconds)}
            </span>
            <span className="text-sm text-muted-foreground">/ {formatTime(targetSeconds)}</span>
          </div>
          <div className="flex gap-2">
            {!done && (
              <>
                <Button variant="outline" size="icon" onClick={() => { setSeconds(0); setRunning(false) }} className="h-9 w-9">
                  <RotateCcw size={14} />
                </Button>
                <Button variant={running ? 'outline' : 'default'} size="icon" onClick={() => setRunning(!running)} className="h-9 w-9">
                  {running ? <Pause size={14} /> : <Play size={14} />}
                </Button>
              </>
            )}
            <Button
              variant={done ? 'success' : 'outline'}
              size="sm"
              onClick={() => { setDone(!done); setRunning(false) }}
            >
              {done ? <Check size={14} /> : 'Done'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Phase Section (warmup, working, finisher) ---

interface ExerciseGroupData {
  exerciseId: number
  name: string
  muscle_group: string
  equipment: string | null
  exercise_notes: string | null
  sets: SessionSet[]
  phase: string
}

function groupByExercise(sets: SessionSet[]): ExerciseGroupData[] {
  const map = new Map<string, ExerciseGroupData>()
  for (const s of sets) {
    const key = `${s.exercise_id}-${s.phase}`
    if (!map.has(key)) {
      map.set(key, {
        exerciseId: s.exercise_id,
        name: s.name,
        muscle_group: s.muscle_group,
        equipment: s.equipment,
        exercise_notes: s.exercise_notes,
        sets: [],
        phase: s.phase,
      })
    }
    map.get(key)!.sets.push(s)
  }
  return Array.from(map.values())
}

function PhaseSection({
  title, subtitle, sets, onUpdateSet, badgeColor,
}: {
  title: string
  subtitle?: string
  sets: SessionSet[]
  onUpdateSet: (set: SessionSet, data: { completed?: boolean; actual_weight?: number; actual_reps?: number }) => void
  badgeColor?: string
}) {
  const exercises = groupByExercise(sets)
  const allDone = sets.every(s => s.completed)
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
    <div className="space-y-3">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
        <div>
          <h2 className={cn('text-sm font-semibold uppercase tracking-wide', badgeColor || 'text-primary')}>
            {title}
            {allDone && <Check size={14} className="inline ml-2 text-success" />}
          </h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{sets.filter(s => s.completed).length}/{sets.length}</span>
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </div>
      </div>
      {!collapsed && exercises.map(group => (
        <ExerciseGroup key={`${group.exerciseId}-${group.phase}`} group={group} onUpdateSet={onUpdateSet} />
      ))}
    </div>
  )
}

function ExerciseGroup({
  group, onUpdateSet,
}: {
  group: ExerciseGroupData
  onUpdateSet: (set: SessionSet, data: { completed?: boolean; actual_weight?: number; actual_reps?: number }) => void
}) {
  const allDone = group.sets.every(s => s.completed)

  return (
    <Card className={cn(allDone && 'border-success/30 opacity-60')}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {allDone && <Check size={16} className="text-success" />}
            <CardTitle className={cn('text-base', allDone && 'line-through text-muted-foreground')}>
              {group.name}
            </CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">{group.sets.filter(s => s.completed).length}/{group.sets.length}</span>
        </div>
        {group.exercise_notes && <p className="text-xs text-primary/80 mt-1">{group.exercise_notes}</p>}
      </CardHeader>
      <CardContent className="space-y-2">
        {group.sets.map(set => (
          <SetRow key={set.id} set={set} onUpdateSet={onUpdateSet} />
        ))}
      </CardContent>
    </Card>
  )
}

function SetRow({ set, onUpdateSet }: { set: SessionSet; onUpdateSet: (set: SessionSet, data: { completed?: boolean; actual_weight?: number; actual_reps?: number }) => void }) {
  const [editing, setEditing] = useState(false)
  const [weight, setWeight] = useState<string>(String(set.actual_weight ?? set.target_weight ?? ''))
  const [reps, setReps] = useState<string>(String(set.actual_reps ?? set.target_reps ?? ''))
  const [animating, setAnimating] = useState(false)

  const handleToggle = () => {
    if (editing) return
    const newCompleted = !set.completed
    if (newCompleted) setAnimating(true)
    onUpdateSet(set, {
      completed: newCompleted,
      actual_weight: parseFloat(weight) || undefined,
      actual_reps: parseInt(reps) || undefined,
    })
    setTimeout(() => setAnimating(false), 300)
  }

  const handleSaveEdit = () => {
    onUpdateSet(set, { actual_weight: parseFloat(weight) || undefined, actual_reps: parseInt(reps) || undefined })
    setEditing(false)
  }

  const label = set.target_duration
    ? `${set.target_duration}s`
    : `${set.actual_weight ?? set.target_weight ?? 'BW'}${(set.actual_weight ?? set.target_weight) ? (set.weight_unit || '') : ''} × ${set.actual_reps ?? set.target_reps}`

  if (editing) {
    return (
      <div className="w-full p-3 rounded-lg bg-muted/50 border border-primary/30 space-y-3">
        <div className="text-sm font-medium text-muted-foreground">Set {set.set_number}</div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Weight</label>
            <div className="flex items-center gap-1">
              <input type="number" inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)}
                className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm font-mono text-center" placeholder="BW" />
              <span className="text-xs text-muted-foreground">{set.weight_unit || ''}</span>
            </div>
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Reps</label>
            <input type="number" inputMode="numeric" value={reps} onChange={e => setReps(e.target.value)}
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm font-mono text-center" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(false)} className="flex-1">Cancel</Button>
          <Button size="sm" onClick={handleSaveEdit} className="flex-1">Save</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={handleToggle}
        className={cn(
          'flex-1 flex items-center justify-between p-3 rounded-lg transition-all min-h-[52px]',
          set.completed ? 'bg-success/10 border border-success/20' : 'bg-muted/50 border border-transparent hover:border-border active:bg-muted',
          animating && 'animate-check'
        )}>
        <div className="flex items-center gap-3">
          <div className={cn('w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all',
            set.completed ? 'bg-success border-success' : 'border-muted-foreground')}>
            {set.completed && <Check size={14} className="text-white" />}
          </div>
          <span className="text-sm font-medium">Set {set.set_number}</span>
        </div>
        <span className={cn('text-sm font-mono', set.completed ? 'text-success' : 'text-foreground')}>{label}</span>
      </button>
      {!set.completed && !set.target_duration && (
        <button onClick={() => setEditing(true)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
        </button>
      )}
    </div>
  )
}

// --- Guided Stretching Flow ---

function GuidedStretching({
  stretches,
  onUpdateSet,
  onFinish,
  onSkipAll,
}: {
  stretches: SessionSet[]
  onUpdateSet: (set: SessionSet, data: { completed?: boolean }) => void
  onFinish: () => void
  onSkipAll: () => void
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [seconds, setSeconds] = useState(stretches[0]?.target_duration || 45)
  const [running, setRunning] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const current = stretches[currentIndex]
  const next = stretches[currentIndex + 1]
  const total = stretches.length
  const completedCount = stretches.filter(s => s.completed).length

  useEffect(() => {
    if (running && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            setRunning(false)
            handleStretchComplete()
            return 0
          }
          return s - 1
        })
      }, 1000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  const handleStretchComplete = () => {
    if (!current) return
    onUpdateSet(current, { completed: true })
    if (currentIndex < total - 1) {
      setTransitioning(true)
      setTimeout(() => {
        const nextStretch = stretches[currentIndex + 1]
        setCurrentIndex(currentIndex + 1)
        setSeconds(nextStretch?.target_duration || 45)
        setTransitioning(false)
        setRunning(true)
      }, 1500)
    } else {
      setTimeout(onFinish, 1000)
    }
  }

  const handleSkip = () => {
    onUpdateSet(current, { completed: true })
    if (currentIndex < total - 1) {
      const nextStretch = stretches[currentIndex + 1]
      setCurrentIndex(currentIndex + 1)
      setSeconds(nextStretch?.target_duration || 45)
      setRunning(false)
    } else {
      onFinish()
    }
  }

  if (!current) return null

  const duration = current.target_duration || 45
  const pct = ((duration - seconds) / duration) * 100
  const circumference = 2 * Math.PI * 90

  return (
    <div className="flex flex-col items-center min-h-[70vh] justify-center space-y-6">
      {/* Progress dots */}
      <div className="flex gap-1.5">
        {stretches.map((s, i) => (
          <div key={s.id} className={cn(
            'w-2.5 h-2.5 rounded-full transition-all',
            i < currentIndex ? 'bg-success' :
            i === currentIndex ? 'bg-primary scale-125' :
            'bg-muted'
          )} />
        ))}
      </div>

      {/* Counter */}
      <p className="text-sm text-muted-foreground">{currentIndex + 1} of {total}</p>

      {/* Circular timer */}
      <div className="relative w-56 h-56">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="90" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
          <circle cx="100" cy="100" r="90" fill="none"
            stroke={seconds === 0 ? 'hsl(var(--success))' : 'hsl(var(--primary))'}
            strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (pct / 100) * circumference}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-5xl font-mono tabular-nums font-bold', seconds === 0 && 'text-success')}>
            {seconds}
          </span>
          <span className="text-sm text-muted-foreground mt-1">seconds</span>
        </div>
      </div>

      {/* Current stretch */}
      <div className={cn('text-center transition-opacity duration-300', transitioning && 'opacity-30')}>
        <h2 className="text-xl font-bold">{current.name}</h2>
        {current.exercise_notes && (
          <p className="text-sm text-muted-foreground mt-1">{current.exercise_notes}</p>
        )}
      </div>

      {/* Next up */}
      {next && !transitioning && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Next up</p>
          <p className="text-sm text-foreground/70">{next.name}</p>
        </div>
      )}

      {transitioning && (
        <div className="text-center">
          <p className="text-sm text-success font-medium">Moving to next stretch...</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-12 w-12 rounded-full"
          onClick={() => { setSeconds(duration); setRunning(false) }}>
          <RotateCcw size={18} />
        </Button>
        <Button size="icon" className={cn('h-16 w-16 rounded-full', running && 'bg-muted text-foreground hover:bg-muted/80')}
          onClick={() => setRunning(!running)}>
          {running ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
        </Button>
        <Button variant="outline" size="icon" className="h-12 w-12 rounded-full"
          onClick={handleSkip}>
          <SkipForward size={18} />
        </Button>
      </div>

      {/* Skip all */}
      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onSkipAll}>
        Skip stretching
      </Button>
    </div>
  )
}

// --- Complete Workout Modal ---

function CompleteModal({
  onComplete,
  onBack,
}: {
  onComplete: (notes?: string) => void
  onBack: () => void
}) {
  const [notes, setNotes] = useState('')

  return (
    <div className="flex flex-col items-center min-h-[60vh] justify-center space-y-6">
      <Trophy size={48} className="text-success" />
      <h2 className="text-2xl font-bold">Workout Complete</h2>
      <p className="text-muted-foreground text-center text-sm">
        Add any notes about this session — injuries, how you felt, weight changes, things to remember next time.
      </p>

      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="e.g. Right elbow felt tight on floor press set 3. Dropped to 60lb. Hamstrings still tight — add extra stretch next time."
        className="w-full h-32 bg-muted/30 border border-border rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-primary"
      />

      <div className="flex gap-3 w-full">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button variant="success" onClick={() => onComplete(notes || undefined)} className="flex-1" size="lg">
          <Trophy size={18} className="mr-2" />
          Save Workout
        </Button>
      </div>

      <button onClick={() => onComplete(undefined)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        Skip notes
      </button>
    </div>
  )
}
