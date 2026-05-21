'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Nav } from '@/components/nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Check, Dumbbell, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function History() {
  const [sessions, setSessions] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.getSessions(50), api.getStats()])
      .then(([sess, st]) => {
        setSessions(sess)
        setStats(st)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Dumbbell className="animate-pulse text-primary" size={40} />
      </div>
    )
  }

  return (
    <main className="pb-20 max-w-lg mx-auto px-4">
      <header className="pt-6 pb-4">
        <h1 className="text-2xl font-bold">History</h1>
      </header>

      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label="Total" value={stats.total_sessions} icon={<Dumbbell size={16} />} />
          <StatCard label="This Week" value={stats.sessions_this_week} icon={<Calendar size={16} />} />
          <StatCard label="Streak" value={`${stats.current_streak}d`} icon={<Check size={16} />} />
        </div>
      )}

      <div className="space-y-3">
        {sessions.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No workouts yet. Start one!</p>
        ) : (
          sessions.map(s => (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{s.template_name || 'Workout'}</CardTitle>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    s.completed_at ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'
                  )}>
                    {s.completed_at ? 'Done' : 'Active'}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Check size={14} />
                    {s.completed_sets}/{s.total_sets} sets
                  </span>
                  {s.completed_at && s.started_at && (
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {duration(s.started_at, s.completed_at)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Nav />
    </main>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <div className="flex justify-center text-primary mb-1">{icon}</div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  )
}

function duration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}
