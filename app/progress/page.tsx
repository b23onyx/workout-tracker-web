'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Nav } from '@/components/nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dumbbell, TrendingUp, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Progress() {
  const [progression, setProgression] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getProgression()
      .then(setProgression)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Dumbbell className="animate-pulse text-primary" size={40} />
      </div>
    )
  }

  const push = progression.filter(p => p.muscle_group === 'push')
  const pull = progression.filter(p => p.muscle_group === 'pull')
  const legs = progression.filter(p => p.muscle_group === 'legs')

  return (
    <main className="pb-20 max-w-lg mx-auto px-4">
      <header className="pt-6 pb-4">
        <h1 className="text-2xl font-bold">Progression</h1>
        <p className="text-muted-foreground text-sm mt-1">Current working weights</p>
      </header>

      {progression.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          Complete some workouts to see your progression.
        </p>
      ) : (
        <div className="space-y-6">
          <ProgressionGroup title="Push" exercises={push} />
          <ProgressionGroup title="Pull" exercises={pull} />
          <ProgressionGroup title="Legs" exercises={legs} />
        </div>
      )}

      <div className="mt-8 mb-4">
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle size={14} className="text-primary" /> Progression Rules
            </h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>Complete all sets at current weight = add 5lb (DB) or 5kg (cable)</li>
              <li>Missed set or form break = hold weight one more session</li>
              <li>Pain (not tightness) = drop 10lb/5kg and rebuild</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Nav />
    </main>
  )
}

function ProgressionGroup({ title, exercises }: { title: string; exercises: any[] }) {
  if (exercises.length === 0) return null

  return (
    <div>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">{title}</h2>
      <div className="space-y-2">
        {exercises.map(p => (
          <Card key={p.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{p.name}</p>
                  {p.notes && <p className="text-xs text-primary/80 mt-0.5">{p.notes}</p>}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold font-mono">
                    {p.current_weight}<span className="text-xs text-muted-foreground ml-1">{p.weight_unit}</span>
                  </p>
                  {p.next_target && (
                    <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                      <TrendingUp size={10} /> {p.next_target}{p.weight_unit}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
