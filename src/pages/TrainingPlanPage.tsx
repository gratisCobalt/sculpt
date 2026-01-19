import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Play,
  GripVertical,
  Wrench,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SkeletonList } from '@/components/ui/loader'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { useState, useEffect } from 'react'

export default function TrainingPlanPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null)

  // Fetch training plan via API
  const { data: planData, isLoading } = useQuery({
    queryKey: ['userTrainingPlan', user?.id],
    queryFn: () => api.getUserTrainingPlan(),
    enabled: !!user?.id,
  })

  const plan = planData
  const days = plan?.days || []
  const selectedDay = days.find((d: any) => d.id === selectedDayId)
  const exercises = selectedDay?.exercises || []

  // Set initial selected day
  useEffect(() => {
    if (days.length > 0 && !selectedDayId) {
      setSelectedDayId(days[0].id)
    }
  }, [days, selectedDayId])

  if (isLoading) {
    return (
      <div className="min-h-screen pb-24 px-6 pt-6 safe-top">
        <SkeletonList count={4} />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="min-h-screen pb-24 px-6 pt-6 safe-top flex flex-col items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Kein Trainingsplan</h2>
          <p className="text-[hsl(var(--muted-foreground))] mb-6">
            Schließe das Onboarding ab, um einen personalisierten Plan zu erhalten
          </p>
          <Button onClick={() => navigate('/onboarding')}>
            Onboarding starten
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 safe-top">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold mb-2">Trainingsplan</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {plan.name}
        </p>
      </div>

      {/* Day Tabs */}
      {days.length > 0 && (
        <div className="px-6 mb-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {days.map((day: any) => (
              <button
                key={day.id}
                onClick={() => setSelectedDayId(day.id)}
                className={cn(
                  'px-4 py-3 rounded-xl whitespace-nowrap transition-all duration-200 flex flex-col items-start',
                  selectedDayId === day.id
                    ? 'gradient-primary text-gray-900'
                    : 'glass glass-hover'
                )}
              >
                <span className="text-xs opacity-80">Tag {day.day_number}</span>
                <span className="font-semibold">{day.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Start Training Button */}
      <div className="px-6 mb-6">
        <Button
          size="lg"
          className="w-full"
          onClick={() => navigate(`/guided-training?dayId=${selectedDayId}`)}
          disabled={!selectedDayId || exercises.length === 0}
        >
          <Play className="w-5 h-5 mr-2" />
          Training starten
        </Button>
      </div>

      {/* Exercises */}
      <div className="px-6">
        <h2 className="text-lg font-semibold mb-4">Übungen</h2>

        {exercises.length > 0 ? (
          <div className="space-y-3">
            {exercises.map((exercise: any, index: number) => (
              <Card key={exercise.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-[hsl(var(--muted-foreground))]">
                      <GripVertical className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[hsl(var(--surface-strong))] flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </span>
                        <h3 className="font-semibold">
                          {exercise.exercise?.name_de || exercise.exercise?.name || 'Übung'}
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 ml-8 mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                        <span>{exercise.sets} Sätze</span>
                        <span>•</span>
                        <span>{exercise.min_reps}-{exercise.max_reps} Wdh.</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-[hsl(var(--muted-foreground))]">
                Keine Übungen für diesen Tag
              </p>
            </CardContent>
          </Card>
        )}

        {/* Coming Soon Notice */}
        <Card className="mt-6 border-dashed">
          <CardContent className="p-4 text-center">
            <Wrench className="w-6 h-6 mx-auto mb-2 text-[hsl(var(--muted-foreground))]" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Plan-Bearbeitung kommt bald
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
